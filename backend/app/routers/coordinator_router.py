from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, or_, and_
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from app import schemas, models, auth
from app.database import get_db
from app.logger import logger

router = APIRouter(prefix="/coordinator", tags=["coordinator"])


async def get_authorized_community_ids(user: models.User, db: AsyncSession) -> List[int]:
    """Returns community IDs the user is authorized to supervise.
    Admins oversee all communities; coordinators oversee only active assignments.
    """
    if user.role == "admin":
        res = await db.execute(select(models.Community.id))
        return [r[0] for r in res.all()]

    res = await db.execute(
        select(models.CoordinatorAssignment.community_id)
        .where(
            models.CoordinatorAssignment.coordinator_id == user.id,
            models.CoordinatorAssignment.is_active == True
        )
    )
    return [r[0] for r in res.all()]


def enforce_community_scope(community_id: int, authorized_ids: List[int]):
    """Strict server-side security gate preventing unauthorized access to unassigned communities."""
    if community_id not in authorized_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: community is not within your assigned supervision scope."
        )


# =========================================================================
# 1. OVERVIEW & OPERATIONAL DASHBOARD
# =========================================================================

@router.get("/overview", response_model=schemas.CoordinatorOverviewStats)
async def get_coordinator_overview(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_coordinator)
):
    """High-level operational stats strictly scoped to coordinator's assigned groups and communities."""
    auth_ids = await get_authorized_community_ids(current_user, db)
    if not auth_ids:
        return {
            "assigned_communities_count": 0,
            "assigned_groups": [],
            "assigned_fieldworkers_count": 0,
            "surveys_total": 0,
            "surveys_submitted": 0,
            "surveys_verified": 0,
            "surveys_flagged": 0,
            "surveys_pending_review": 0,
            "open_issues_count": 0,
            "resolved_issues_count": 0,
            "gis_summary": {"has_boundary_count": 0, "total_roads": 0, "total_facilities": 0},
            "recent_activity": []
        }

    # Query assigned communities & groups
    comm_q = await db.execute(
        select(models.Community).where(models.Community.id.in_(auth_ids))
    )
    communities = comm_q.scalars().all()
    groups = sorted(list({c.group_number for c in communities if c.group_number is not None}))

    # Count assigned fieldworkers
    fw_count_res = await db.execute(
        select(func.count(models.User.id)).where(
            models.User.community_id.in_(auth_ids),
            models.User.role == "student"
        )
    )
    assigned_fw_count = fw_count_res.scalar() or 0

    # Surveys breakdown in scope
    surveys_q = await db.execute(
        select(
            models.SurveyRecord.status,
            models.SurveyRecord.review_status,
            func.count(models.SurveyRecord.id)
        )
        .where(models.SurveyRecord.community_id.in_(auth_ids))
        .group_by(models.SurveyRecord.status, models.SurveyRecord.review_status)
    )
    total_surveys = 0
    submitted_surveys = 0
    verified_surveys = 0
    flagged_surveys = 0
    pending_review = 0

    for st_status, rev_status, cnt in surveys_q.all():
        if st_status != "DELETED":
            total_surveys += cnt
        if st_status == "SUBMITTED":
            submitted_surveys += cnt
            if rev_status == "VERIFIED":
                verified_surveys += cnt
            elif rev_status == "FLAGGED":
                flagged_surveys += cnt
            else:
                pending_review += cnt

    # Issues breakdown
    issues_q = await db.execute(
        select(models.FieldworkIssue.status, func.count(models.FieldworkIssue.id))
        .where(models.FieldworkIssue.community_id.in_(auth_ids))
        .group_by(models.FieldworkIssue.status)
    )
    open_issues = 0
    resolved_issues = 0
    for iss_status, cnt in issues_q.all():
        if iss_status in ("OPEN", "UNDER_INVESTIGATION"):
            open_issues += cnt
        elif iss_status in ("RESOLVED", "ESCALATED"):
            resolved_issues += cnt

    # GIS assets count
    boundaries_count = sum(1 for c in communities if c.spatial_metadata and c.spatial_metadata.get("geometry"))
    feats_q = await db.execute(
        select(models.FieldFeature.feature_type, func.count(models.FieldFeature.id))
        .where(models.FieldFeature.community_id.in_(auth_ids))
        .group_by(models.FieldFeature.feature_type)
    )
    roads_count = 0
    facility_count = 0
    for f_type, cnt in feats_q.all():
        if f_type == "ROAD":
            roads_count += cnt
        else:
            facility_count += cnt

    # Recent activity
    recent_surveys = await db.execute(
        select(models.SurveyRecord, models.User, models.Community)
        .join(models.User, models.SurveyRecord.created_by_student_id == models.User.id)
        .join(models.Community, models.SurveyRecord.community_id == models.Community.id)
        .where(models.SurveyRecord.community_id.in_(auth_ids))
        .order_by(desc(models.SurveyRecord.created_at))
        .limit(10)
    )
    recent_activity = []
    for sr, student, comm in recent_surveys.all():
        recent_activity.append({
            "type": "SURVEY_SUBMISSION" if sr.status == "SUBMITTED" else "SURVEY_DRAFT",
            "id": sr.id,
            "entity_id": sr.entity_id,
            "survey_type": sr.survey_type,
            "student_name": student.name,
            "student_index": student.student_id,
            "community_name": comm.name,
            "timestamp": sr.submitted_at or sr.created_at,
            "review_status": sr.review_status
        })

    return {
        "assigned_communities_count": len(communities),
        "assigned_groups": groups,
        "assigned_fieldworkers_count": assigned_fw_count,
        "surveys_total": total_surveys,
        "surveys_submitted": submitted_surveys,
        "surveys_verified": verified_surveys,
        "surveys_flagged": flagged_surveys,
        "surveys_pending_review": pending_review,
        "open_issues_count": open_issues,
        "resolved_issues_count": resolved_issues,
        "gis_summary": {
            "has_boundary_count": boundaries_count,
            "total_roads": roads_count,
            "total_facilities": facility_count
        },
        "recent_activity": recent_activity
    }


# =========================================================================
# 2. MY GROUPS & COMMUNITIES
# =========================================================================

@router.get("/communities")
async def list_assigned_communities(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_coordinator)
):
    """View assigned groups and their communities with fieldwork & GIS progress."""
    auth_ids = await get_authorized_community_ids(current_user, db)
    if not auth_ids:
        return []

    comms_q = await db.execute(
        select(models.Community).where(models.Community.id.in_(auth_ids)).order_by(models.Community.group_number.asc())
    )
    comms = comms_q.scalars().all()

    # Pre-fetch aggregate stats
    results = []
    for c in comms:
        # Survey counts by type
        survey_counts_q = await db.execute(
            select(models.SurveyRecord.survey_type, func.count(models.SurveyRecord.id))
            .where(models.SurveyRecord.community_id == c.id, models.SurveyRecord.status == "SUBMITTED")
            .group_by(models.SurveyRecord.survey_type)
        )
        type_counts = {t.lower(): cnt for t, cnt in survey_counts_q.all()}
        total_sub = sum(type_counts.values())

        # Unresolved issues count
        iss_q = await db.execute(
            select(func.count(models.FieldworkIssue.id)).where(
                models.FieldworkIssue.community_id == c.id,
                models.FieldworkIssue.status.in_(["OPEN", "UNDER_INVESTIGATION"])
            )
        )
        open_issues = iss_q.scalar() or 0

        # GIS counts
        feats_q = await db.execute(
            select(models.FieldFeature.feature_type, func.count(models.FieldFeature.id))
            .where(models.FieldFeature.community_id == c.id)
            .group_by(models.FieldFeature.feature_type)
        )
        roads = 0
        facilities = 0
        for ft, cnt in feats_q.all():
            if ft == "ROAD":
                roads += cnt
            else:
                facilities += cnt

        results.append({
            "id": c.id,
            "name": c.name,
            "district": c.district,
            "region": c.region,
            "group_number": c.group_number,
            "capacity": c.capacity,
            "student_count": c.current_count,
            "has_boundary": bool(c.spatial_metadata and c.spatial_metadata.get("geometry")),
            "latitude": c.latitude,
            "longitude": c.longitude,
            "roads_count": roads,
            "facilities_count": facilities,
            "surveys_submitted": total_sub,
            "surveys_breakdown": type_counts,
            "open_issues_count": open_issues
        })

    return results


@router.get("/communities/{community_id}")
async def get_community_detail(
    community_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_coordinator)
):
    """Detailed community supervision view including student roster and spatial coverage."""
    auth_ids = await get_authorized_community_ids(current_user, db)
    enforce_community_scope(community_id, auth_ids)

    community = await db.get(models.Community, community_id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    # Fetch student roster
    st_q = await db.execute(
        select(models.User).where(models.User.community_id == community_id, models.User.role == "student")
    )
    students = st_q.scalars().all()
    roster = []
    for s in students:
        # Student's submitted survey count
        s_cnt_res = await db.execute(
            select(func.count(models.SurveyRecord.id)).where(
                models.SurveyRecord.created_by_student_id == s.id,
                models.SurveyRecord.status == "SUBMITTED"
            )
        )
        sub_count = s_cnt_res.scalar() or 0
        roster.append({
            "id": s.id,
            "student_id": s.student_id,
            "name": s.name,
            "email": s.email,
            "phone_number": s.phone_number,
            "faculty": s.faculty,
            "program": s.program,
            "is_active": s.is_active,
            "submissions_count": sub_count
        })

    # Fetch features
    feat_q = await db.execute(
        select(models.FieldFeature).where(models.FieldFeature.community_id == community_id)
    )
    features = feat_q.scalars().all()

    return {
        "community": {
            "id": community.id,
            "name": community.name,
            "district": community.district,
            "region": community.region,
            "group_number": community.group_number,
            "capacity": community.capacity,
            "student_count": community.current_count,
            "latitude": community.latitude,
            "longitude": community.longitude,
            "spatial_metadata": community.spatial_metadata
        },
        "roster": roster,
        "features": features
    }


# =========================================================================
# 3. FIELDWORKERS MONITORING
# =========================================================================

@router.get("/fieldworkers")
async def list_assigned_fieldworkers(
    community_id: Optional[int] = None,
    group_number: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_coordinator)
):
    """View and supervise all fieldworkers within coordinator's assigned scope."""
    auth_ids = await get_authorized_community_ids(current_user, db)
    if not auth_ids:
        return []

    # Filter by specific community if provided
    query_community_ids = auth_ids
    if community_id:
        enforce_community_scope(community_id, auth_ids)
        query_community_ids = [community_id]

    # Query students
    query = (
        select(models.User, models.Community)
        .join(models.Community, models.User.community_id == models.Community.id)
        .where(
            models.User.community_id.in_(query_community_ids),
            models.User.role == "student"
        )
    )

    if group_number:
        query = query.where(models.Community.group_number == group_number)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                models.User.name.ilike(search_term),
                models.User.student_id.ilike(search_term),
                models.User.email.ilike(search_term)
            )
        )

    query = query.order_by(models.Community.name.asc(), models.User.name.asc())
    rows = (await db.execute(query)).all()

    results = []
    for user, comm in rows:
        # Submissions vs drafts count
        sub_res = await db.execute(
            select(func.count(models.SurveyRecord.id)).where(
                models.SurveyRecord.created_by_student_id == user.id,
                models.SurveyRecord.status == "SUBMITTED"
            )
        )
        sub_cnt = sub_res.scalar() or 0

        draft_res = await db.execute(
            select(func.count(models.SurveyRecord.id)).where(
                models.SurveyRecord.created_by_student_id == user.id,
                models.SurveyRecord.status == "DRAFT"
            )
        )
        draft_cnt = draft_res.scalar() or 0

        # Last activity / submission time
        last_rec = await db.execute(
            select(func.max(models.SurveyRecord.updated_at)).where(
                models.SurveyRecord.created_by_student_id == user.id
            )
        )
        last_activity = last_rec.scalar()

        # Open issues for this student
        iss_res = await db.execute(
            select(func.count(models.FieldworkIssue.id)).where(
                models.FieldworkIssue.student_id == user.id,
                models.FieldworkIssue.status.in_(["OPEN", "UNDER_INVESTIGATION"])
            )
        )
        open_issues = iss_res.scalar() or 0

        results.append({
            "id": user.id,
            "student_id": user.student_id,
            "name": user.name,
            "email": user.email,
            "phone_number": user.phone_number,
            "faculty": user.faculty,
            "program": user.program,
            "community_id": comm.id,
            "community_name": comm.name,
            "group_number": comm.group_number,
            "submissions_count": sub_cnt,
            "drafts_count": draft_cnt,
            "last_activity": last_activity,
            "open_issues_count": open_issues,
            "is_active": user.is_active
        })

    return results


@router.get("/fieldworkers/{student_id}")
async def get_fieldworker_detail(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_coordinator)
):
    """Detailed supervision profile of an assigned student, including submissions and issue history."""
    auth_ids = await get_authorized_community_ids(current_user, db)
    student = await db.get(models.User, student_id)
    if not student or student.role != "student":
        raise HTTPException(status_code=404, detail="Student not found")

    if student.community_id not in auth_ids:
        raise HTTPException(status_code=403, detail="Student is not within your assigned community scope")

    community = await db.get(models.Community, student.community_id)

    # All surveys
    surveys_q = await db.execute(
        select(models.SurveyRecord)
        .where(models.SurveyRecord.created_by_student_id == student.id)
        .order_by(desc(models.SurveyRecord.created_at))
    )
    surveys = surveys_q.scalars().all()

    # All issues
    issues_q = await db.execute(
        select(models.FieldworkIssue)
        .where(models.FieldworkIssue.student_id == student.id)
        .order_by(desc(models.FieldworkIssue.created_at))
    )
    issues = issues_q.scalars().all()

    return {
        "student": {
            "id": student.id,
            "student_id": student.student_id,
            "name": student.name,
            "email": student.email,
            "phone_number": student.phone_number,
            "faculty": student.faculty,
            "program": student.program,
            "community_id": student.community_id,
            "community_name": community.name if community else None,
            "group_number": community.group_number if community else None,
            "is_active": student.is_active
        },
        "surveys": surveys,
        "issues": issues
    }


# =========================================================================
# 4. SURVEYS INSPECTION & QUALITY REVIEW GATE
# =========================================================================

@router.get("/surveys")
async def list_scoped_surveys(
    community_id: Optional[int] = None,
    survey_type: Optional[str] = None,
    review_status: Optional[str] = None,
    status_filter: Optional[str] = "SUBMITTED",
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_coordinator)
):
    """Search and inspect submitted surveys across assigned communities."""
    auth_ids = await get_authorized_community_ids(current_user, db)
    if not auth_ids:
        return {"items": [], "total": 0}

    query_comm_ids = auth_ids
    if community_id:
        enforce_community_scope(community_id, auth_ids)
        query_comm_ids = [community_id]

    query = (
        select(models.SurveyRecord, models.User, models.Community)
        .join(models.User, models.SurveyRecord.created_by_student_id == models.User.id)
        .join(models.Community, models.SurveyRecord.community_id == models.Community.id)
        .where(models.SurveyRecord.community_id.in_(query_comm_ids))
    )

    if status_filter:
        query = query.where(models.SurveyRecord.status == status_filter)

    if survey_type:
        query = query.where(models.SurveyRecord.survey_type == survey_type.upper())

    if review_status:
        query = query.where(models.SurveyRecord.review_status == review_status.upper())

    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                models.SurveyRecord.entity_id.ilike(search_term),
                models.User.name.ilike(search_term),
                models.User.student_id.ilike(search_term)
            )
        )

    # Count total
    count_q = select(func.count(models.SurveyRecord.id)).select_from(query.subquery())
    total_res = await db.execute(count_q)
    total = total_res.scalar() or 0

    query = query.order_by(desc(models.SurveyRecord.submitted_at or models.SurveyRecord.created_at))
    query = query.limit(limit).offset(offset)
    rows = (await db.execute(query)).all()

    items = []
    for sr, student, comm in rows:
        items.append({
            "id": sr.id,
            "community_id": sr.community_id,
            "community_name": comm.name,
            "group_number": comm.group_number,
            "student_id": student.id,
            "student_name": student.name,
            "student_index": student.student_id,
            "survey_type": sr.survey_type,
            "entity_id": sr.entity_id,
            "field_feature_id": sr.field_feature_id,
            "status": sr.status,
            "review_status": sr.review_status,
            "review_notes": sr.review_notes,
            "reviewed_at": sr.reviewed_at,
            "submitted_at": sr.submitted_at,
            "created_at": sr.created_at
        })

    return {"items": items, "total": total}


@router.get("/surveys/{survey_id}")
async def get_survey_deep_inspection(
    survey_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_coordinator)
):
    """Deep inspection of a single survey questionnaire including all answers and GPS facility linkage."""
    auth_ids = await get_authorized_community_ids(current_user, db)
    
    sr = await db.get(models.SurveyRecord, survey_id)
    if not sr:
        raise HTTPException(status_code=404, detail="Survey record not found")

    enforce_community_scope(sr.community_id, auth_ids)

    community = await db.get(models.Community, sr.community_id)
    student = await db.get(models.User, sr.created_by_student_id)

    # Fetch answers with question details
    ans_q = await db.execute(
        select(models.SurveyAnswer, models.SurveyQuestion)
        .join(models.SurveyQuestion, models.SurveyAnswer.question_id == models.SurveyQuestion.id)
        .where(models.SurveyAnswer.survey_record_id == sr.id)
        .order_by(models.SurveyQuestion.order_number.asc())
    )
    answers_data = []
    for ans, q in ans_q.all():
        answers_data.append({
            "question_id": q.id,
            "section": q.section,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "answer": ans.answer
        })

    # Fetch attached GIS feature if any
    field_feature = None
    if sr.field_feature_id:
        feat = await db.get(models.FieldFeature, sr.field_feature_id)
        if feat:
            field_feature = {
                "id": feat.id,
                "feature_type": feat.feature_type,
                "latitude": feat.latitude,
                "longitude": feat.longitude,
                "accuracy_meters": feat.accuracy_meters,
                "metadata_json": feat.metadata_json,
                "captured_at": feat.captured_at
            }

    # Fetch reviewer details if reviewed
    reviewer_name = None
    if sr.reviewed_by_id:
        reviewer = await db.get(models.User, sr.reviewed_by_id)
        if reviewer:
            reviewer_name = reviewer.name

    return {
        "survey": {
            "id": sr.id,
            "community_id": sr.community_id,
            "community_name": community.name if community else None,
            "group_number": community.group_number if community else None,
            "student_id": student.id if student else None,
            "student_name": student.name if student else None,
            "student_index": student.student_id if student else None,
            "survey_type": sr.survey_type,
            "entity_id": sr.entity_id,
            "status": sr.status,
            "review_status": sr.review_status,
            "review_notes": sr.review_notes,
            "reviewed_at": sr.reviewed_at,
            "reviewed_by_name": reviewer_name,
            "submitted_at": sr.submitted_at,
            "created_at": sr.created_at
        },
        "answers": answers_data,
        "field_feature": field_feature
    }


@router.post("/surveys/{survey_id}/review")
async def review_survey(
    survey_id: str,
    payload: schemas.SurveyReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_coordinator)
):
    """Review and verify or flag a survey submission. Updates review status and records audit history."""
    auth_ids = await get_authorized_community_ids(current_user, db)
    
    sr = await db.get(models.SurveyRecord, survey_id)
    if not sr:
        raise HTTPException(status_code=404, detail="Survey record not found")

    enforce_community_scope(sr.community_id, auth_ids)

    valid_statuses = ("VERIFIED", "FLAGGED", "PENDING")
    new_status = payload.review_status.upper()
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid review status. Must be one of {valid_statuses}")

    sr.review_status = new_status
    sr.review_notes = payload.review_notes.strip() if payload.review_notes else None
    sr.reviewed_at = datetime.now(timezone.utc)
    sr.reviewed_by_id = current_user.id

    audit = models.AuditLog(
        action=f"SURVEY_{new_status}",
        user_id=str(current_user.id),
        metadata_payload={
            "survey_id": sr.id,
            "community_id": sr.community_id,
            "student_id": sr.created_by_student_id,
            "review_status": new_status,
            "notes": sr.review_notes
        }
    )
    db.add(audit)
    await db.commit()
    await db.refresh(sr)

    return {
        "success": True,
        "survey_id": sr.id,
        "review_status": sr.review_status,
        "review_notes": sr.review_notes,
        "reviewed_at": sr.reviewed_at
    }


# =========================================================================
# 5. REVIEW AND INVESTIGATION QUEUE (INCIDENTS / ISSUES)
# =========================================================================

@router.get("/issues", response_model=List[schemas.FieldworkIssueResponse])
async def list_issues(
    community_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    severity: Optional[str] = None,
    student_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_coordinator)
):
    """List investigation issues flagged across coordinator's assigned scope."""
    auth_ids = await get_authorized_community_ids(current_user, db)
    if not auth_ids:
        return []

    query_comm_ids = auth_ids
    if community_id:
        enforce_community_scope(community_id, auth_ids)
        query_comm_ids = [community_id]

    query = (
        select(models.FieldworkIssue, models.Community, models.User, models.User)
        .join(models.Community, models.FieldworkIssue.community_id == models.Community.id)
        .join(models.User, models.FieldworkIssue.student_id == models.User.id)
        .outerjoin(models.User, models.FieldworkIssue.created_by_id == models.User.id)
        .where(models.FieldworkIssue.community_id.in_(query_comm_ids))
    )

    if status_filter:
        query = query.where(models.FieldworkIssue.status == status_filter.upper())
    if severity:
        query = query.where(models.FieldworkIssue.severity == severity.upper())
    if student_id:
        query = query.where(models.FieldworkIssue.student_id == student_id)

    query = query.order_by(desc(models.FieldworkIssue.created_at))
    rows = (await db.execute(query)).all()

    results = []
    for issue, comm, student, creator in rows:
        results.append({
            "id": issue.id,
            "community_id": issue.community_id,
            "community_name": comm.name,
            "group_number": comm.group_number,
            "student_id": issue.student_id,
            "student_name": student.name,
            "student_index": student.student_id,
            "survey_id": issue.survey_id,
            "survey_type": None,
            "created_by_id": issue.created_by_id,
            "created_by_name": creator.name if creator else "System",
            "title": issue.title,
            "issue_type": issue.issue_type,
            "severity": issue.severity,
            "status": issue.status,
            "reason": issue.reason,
            "evidence": issue.evidence,
            "fieldworker_explanation": issue.fieldworker_explanation,
            "action_requested": issue.action_requested,
            "outcome": issue.outcome,
            "deadline": issue.deadline,
            "resolved_at": issue.resolved_at,
            "resolved_by_id": issue.resolved_by_id,
            "escalated_at": issue.escalated_at,
            "created_at": issue.created_at,
            "updated_at": issue.updated_at
        })

    return results


@router.post("/issues", response_model=schemas.FieldworkIssueResponse, status_code=status.HTTP_201_CREATED)
async def create_issue(
    payload: schemas.FieldworkIssueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_coordinator)
):
    """Raise a new fieldwork investigation issue with reason, evidence, and corrective action request."""
    auth_ids = await get_authorized_community_ids(current_user, db)
    enforce_community_scope(payload.community_id, auth_ids)

    # Validate student belongs to community
    student = await db.get(models.User, payload.student_id)
    if not student or student.community_id != payload.community_id:
        raise HTTPException(status_code=400, detail="Student does not belong to this community")

    # If survey_id is linked, validate it belongs to this student and community
    if payload.survey_id:
        survey = await db.get(models.SurveyRecord, payload.survey_id)
        if not survey or survey.community_id != payload.community_id:
            raise HTTPException(status_code=400, detail="Survey record does not match community")

    new_issue = models.FieldworkIssue(
        community_id=payload.community_id,
        student_id=payload.student_id,
        survey_id=payload.survey_id,
        created_by_id=current_user.id,
        title=payload.title.strip(),
        issue_type=payload.issue_type.upper(),
        severity=(payload.severity or "MEDIUM").upper(),
        status="OPEN",
        reason=payload.reason.strip(),
        action_requested=payload.action_requested.strip() if payload.action_requested else None,
        deadline=payload.deadline,
        evidence=payload.evidence
    )
    db.add(new_issue)
    await db.flush()

    audit = models.AuditLog(
        action="FIELDWORK_ISSUE_CREATED",
        user_id=str(current_user.id),
        metadata_payload={
            "issue_id": new_issue.id,
            "community_id": new_issue.community_id,
            "student_id": new_issue.student_id,
            "issue_type": new_issue.issue_type,
            "severity": new_issue.severity
        }
    )
    db.add(audit)
    await db.commit()
    await db.refresh(new_issue)

    comm = await db.get(models.Community, new_issue.community_id)
    return {
        "id": new_issue.id,
        "community_id": new_issue.community_id,
        "community_name": comm.name if comm else None,
        "group_number": comm.group_number if comm else None,
        "student_id": student.id,
        "student_name": student.name,
        "student_index": student.student_id,
        "survey_id": new_issue.survey_id,
        "survey_type": None,
        "created_by_id": current_user.id,
        "created_by_name": current_user.name,
        "title": new_issue.title,
        "issue_type": new_issue.issue_type,
        "severity": new_issue.severity,
        "status": new_issue.status,
        "reason": new_issue.reason,
        "evidence": new_issue.evidence,
        "fieldworker_explanation": new_issue.fieldworker_explanation,
        "action_requested": new_issue.action_requested,
        "outcome": new_issue.outcome,
        "deadline": new_issue.deadline,
        "resolved_at": new_issue.resolved_at,
        "resolved_by_id": new_issue.resolved_by_id,
        "escalated_at": new_issue.escalated_at,
        "created_at": new_issue.created_at,
        "updated_at": new_issue.updated_at
    }


@router.patch("/issues/{issue_id}", response_model=schemas.FieldworkIssueResponse)
async def update_issue(
    issue_id: str,
    payload: schemas.FieldworkIssueUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_coordinator)
):
    """Update issue: record fieldworker explanation, outcome, resolution, or escalate to administrator."""
    auth_ids = await get_authorized_community_ids(current_user, db)
    
    issue = await db.get(models.FieldworkIssue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    enforce_community_scope(issue.community_id, auth_ids)

    if payload.fieldworker_explanation is not None:
        issue.fieldworker_explanation = payload.fieldworker_explanation.strip()
    if payload.action_requested is not None:
        issue.action_requested = payload.action_requested.strip()
    if payload.outcome is not None:
        issue.outcome = payload.outcome.strip()
    if payload.severity is not None:
        issue.severity = payload.severity.upper()
    if payload.deadline is not None:
        issue.deadline = payload.deadline

    # Handle status transitions
    if payload.status:
        new_st = payload.status.upper()
        if new_st in ("RESOLVED", "CLOSED"):
            issue.status = "RESOLVED"
            issue.resolved_at = datetime.now(timezone.utc)
            issue.resolved_by_id = current_user.id
        elif new_st == "ESCALATED":
            issue.status = "ESCALATED"
            issue.escalated_at = datetime.now(timezone.utc)
        elif new_st in ("UNDER_INVESTIGATION", "OPEN"):
            issue.status = new_st

    audit = models.AuditLog(
        action="FIELDWORK_ISSUE_UPDATED",
        user_id=str(current_user.id),
        metadata_payload={
            "issue_id": issue.id,
            "status": issue.status,
            "outcome": issue.outcome
        }
    )
    db.add(audit)
    await db.commit()
    await db.refresh(issue)

    comm = await db.get(models.Community, issue.community_id)
    student = await db.get(models.User, issue.student_id)
    return {
        "id": issue.id,
        "community_id": issue.community_id,
        "community_name": comm.name if comm else None,
        "group_number": comm.group_number if comm else None,
        "student_id": student.id if student else None,
        "student_name": student.name if student else None,
        "student_index": student.student_id if student else None,
        "survey_id": issue.survey_id,
        "survey_type": None,
        "created_by_id": issue.created_by_id,
        "created_by_name": current_user.name,
        "title": issue.title,
        "issue_type": issue.issue_type,
        "severity": issue.severity,
        "status": issue.status,
        "reason": issue.reason,
        "evidence": issue.evidence,
        "fieldworker_explanation": issue.fieldworker_explanation,
        "action_requested": issue.action_requested,
        "outcome": issue.outcome,
        "deadline": issue.deadline,
        "resolved_at": issue.resolved_at,
        "resolved_by_id": issue.resolved_by_id,
        "escalated_at": issue.escalated_at,
        "created_at": issue.created_at,
        "updated_at": issue.updated_at
    }


# =========================================================================
# 6. READ-ONLY COMMUNITY GIS COVERAGE
# =========================================================================

@router.get("/gis/{community_id}")
async def get_community_gis_data(
    community_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_coordinator)
):
    """Read-only GIS inspection of assigned community boundary, access roads, and mapped facilities."""
    auth_ids = await get_authorized_community_ids(current_user, db)
    enforce_community_scope(community_id, auth_ids)

    community = await db.get(models.Community, community_id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    features_q = await db.execute(
        select(models.FieldFeature).where(models.FieldFeature.community_id == community_id)
    )
    features = features_q.scalars().all()

    return {
        "community": {
            "id": community.id,
            "name": community.name,
            "district": community.district,
            "region": community.region,
            "group_number": community.group_number,
            "latitude": community.latitude,
            "longitude": community.longitude,
            "spatial_metadata": community.spatial_metadata
        },
        "features": features
    }


# =========================================================================
# 7. SCOPED OPERATIONAL REPORTS
# =========================================================================

@router.get("/reports")
async def get_coordinator_reports(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_coordinator)
):
    """Generate coordinator-level progress, data quality, and investigation reports for assigned scope."""
    auth_ids = await get_authorized_community_ids(current_user, db)
    if not auth_ids:
        return {"communities_progress": [], "fieldworker_summary": [], "issues_summary": {}}

    comms_q = await db.execute(
        select(models.Community).where(models.Community.id.in_(auth_ids)).order_by(models.Community.group_number.asc())
    )
    comms = comms_q.scalars().all()

    progress = []
    for c in comms:
        # Survey breakdown
        surv_q = await db.execute(
            select(
                models.SurveyRecord.survey_type,
                models.SurveyRecord.review_status,
                func.count(models.SurveyRecord.id)
            )
            .where(models.SurveyRecord.community_id == c.id, models.SurveyRecord.status == "SUBMITTED")
            .group_by(models.SurveyRecord.survey_type, models.SurveyRecord.review_status)
        )
        total = 0
        verified = 0
        flagged = 0
        by_type = {}
        for st_type, rev_status, cnt in surv_q.all():
            total += cnt
            if rev_status == "VERIFIED":
                verified += cnt
            elif rev_status == "FLAGGED":
                flagged += cnt
            t_key = st_type.lower()
            by_type[t_key] = by_type.get(t_key, 0) + cnt

        progress.append({
            "community_id": c.id,
            "community_name": c.name,
            "group_number": c.group_number,
            "student_count": c.current_count,
            "total_submitted": total,
            "verified": verified,
            "flagged": flagged,
            "pending": total - (verified + flagged),
            "by_type": by_type,
            "has_boundary": bool(c.spatial_metadata and c.spatial_metadata.get("geometry"))
        })

    # Issues summary
    iss_q = await db.execute(
        select(models.FieldworkIssue.status, func.count(models.FieldworkIssue.id))
        .where(models.FieldworkIssue.community_id.in_(auth_ids))
        .group_by(models.FieldworkIssue.status)
    )
    issues_by_status = {st: cnt for st, cnt in iss_q.all()}

    iss_type_q = await db.execute(
        select(models.FieldworkIssue.issue_type, func.count(models.FieldworkIssue.id))
        .where(models.FieldworkIssue.community_id.in_(auth_ids))
        .group_by(models.FieldworkIssue.issue_type)
    )
    issues_by_type = {it: cnt for it, cnt in iss_type_q.all()}

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "coordinator_name": current_user.name,
        "communities_progress": progress,
        "issues_summary": {
            "by_status": issues_by_status,
            "by_type": issues_by_type,
            "total_open": issues_by_status.get("OPEN", 0) + issues_by_status.get("UNDER_INVESTIGATION", 0),
            "total_resolved": issues_by_status.get("RESOLVED", 0)
        }
    }

