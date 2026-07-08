from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case
from typing import List, Dict, Any
from pydantic import BaseModel
import re

from app import models, auth
from app.database import get_db
from sqlalchemy import delete
import traceback

router = APIRouter(prefix="/api/student/surveys", tags=["student_surveys"])

class SurveyAnswerUpdate(BaseModel):
    answers: List[Dict[str, Any]] # [{"question_id": "...", "answer": ...}]

SURVEY_TYPES = ["HOUSEHOLD", "EDUCATION", "HEALTH", "GOVERNANCE"]

async def get_current_student(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not a student")
    if not current_user.community_id:
        raise HTTPException(status_code=403, detail="Student has no assigned community")
    
    # Load community
    result = await db.execute(select(models.Community).filter(models.Community.id == current_user.community_id))
    community = result.scalars().first()
    if not community:
        raise HTTPException(status_code=403, detail="Community not found")
        
    return current_user, community

@router.get("/stats")
async def get_survey_stats(
    db: AsyncSession = Depends(get_db), 
    user_data: tuple = Depends(get_current_student)
):
    current_user, community = user_data
    
    # Fetch all records for this community
    result = await db.execute(
        select(models.SurveyRecord.survey_type, models.SurveyRecord.status, func.count())
        .where(models.SurveyRecord.community_id == community.id)
        .group_by(models.SurveyRecord.survey_type, models.SurveyRecord.status)
    )
    rows = result.all()
    
    stats = {stype: {"submitted": 0, "drafts": 0} for stype in SURVEY_TYPES}
    for row in rows:
        stype, status, count = row
        if stype in stats:
            if status == "SUBMITTED":
                stats[stype]["submitted"] = count
            else:
                stats[stype]["drafts"] = count
                
    return stats

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db), 
    user_data: tuple = Depends(get_current_student)
):
    current_user, community = user_data
    
    # Compute counts using case statements
    result = await db.execute(
        select(
            func.count().label("total"),
            func.sum(case((models.SurveyRecord.status == "DRAFT", 1), else_=0)).label("draft"),
            func.sum(case((models.SurveyRecord.status == "SUBMITTED", 1), else_=0)).label("submitted"),
            func.sum(case((models.SurveyRecord.sync_status == "pending", 1), else_=0)).label("pending"),
            func.sum(case((models.SurveyRecord.sync_status == "synced", 1), else_=0)).label("synced"),
            func.sum(case((models.SurveyRecord.sync_status == "failed", 1), else_=0)).label("failed"),
        )
        .where(models.SurveyRecord.created_by_student_id == current_user.id)
    )
    counts = result.first()
    
    total = int(counts.total or 0) if counts else 0
    draft = int(counts.draft or 0) if counts else 0
    submitted = int(counts.submitted or 0) if counts else 0
    pending = int(counts.pending or 0) if counts else 0
    synced = int(counts.synced or 0) if counts else 0
    failed = int(counts.failed or 0) if counts else 0
    
    # Last activity
    last_act_res = await db.execute(
        select(func.max(models.SurveyRecord.updated_at))
        .where(models.SurveyRecord.created_by_student_id == current_user.id)
    )
    last_act = last_act_res.scalar()
    
    # Recent surveys
    recent_res = await db.execute(
        select(models.SurveyRecord)
        .where(models.SurveyRecord.created_by_student_id == current_user.id)
        .order_by(models.SurveyRecord.updated_at.desc())
        .limit(5)
    )
    recent = recent_res.scalars().all()
    
    recent_data = [
        {
            "id": r.id,
            "survey_type": r.survey_type,
            "house_number": r.house_number,
            "status": r.status,
            "sync_status": r.sync_status,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None
        }
        for r in recent
    ]
    
    return {
        "total_surveys": total,
        "draft_surveys": draft,
        "submitted_surveys": submitted,
        "pending_sync": pending,
        "synced_surveys": synced,
        "failed_sync": failed,
        "last_activity": last_act.isoformat() if last_act else None,
        "recent_surveys": recent_data
    }

@router.get("/debug_records")
async def debug_records(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.SurveyRecord).limit(10))
    records = result.scalars().all()
    return [{"id": r.id, "community_id": r.community_id, "created_by_student_id": r.created_by_student_id, "status": r.status} for r in records]

@router.get("/drafts/all")
async def get_all_drafts(
    skip: int = 0,
    limit: int = 20,
    search: str = None,
    survey_type: str = None,
    db: AsyncSession = Depends(get_db), 
    user_data: tuple = Depends(get_current_student)
):
    current_user, community = user_data
    
    # 1. Get total questions per type for progress calculation
    q_counts = await db.execute(
        select(models.SurveyQuestion.survey_type, func.count(models.SurveyQuestion.id))
        .group_by(models.SurveyQuestion.survey_type)
    )
    total_qs = dict(q_counts.all())

    # 2. Build query
    query = select(
        models.SurveyRecord,
        func.count(models.SurveyAnswer.id).label("answered_count")
    ).outerjoin(
        models.SurveyAnswer, models.SurveyRecord.id == models.SurveyAnswer.survey_record_id
    ).where(
        models.SurveyRecord.community_id == community.id,
        models.SurveyRecord.created_by_student_id == current_user.id,
        models.SurveyRecord.status == "DRAFT"
    ).group_by(models.SurveyRecord.id)

    if search:
        query = query.where(models.SurveyRecord.house_number.ilike(f"%{search}%"))
    if survey_type:
        query = query.where(models.SurveyRecord.survey_type == survey_type.upper())

    # 3. Get total count for pagination
    count_query = select(func.count()).select_from(
        select(models.SurveyRecord.id).where(
            models.SurveyRecord.community_id == community.id,
            models.SurveyRecord.created_by_student_id == current_user.id,
            models.SurveyRecord.status == "DRAFT",
            models.SurveyRecord.house_number.ilike(f"%{search}%") if search else True,
            models.SurveyRecord.survey_type == survey_type.upper() if survey_type else True
        ).subquery()
    )
    total_records = (await db.execute(count_query)).scalar() or 0

    # 4. Fetch paginated records
    query = query.order_by(models.SurveyRecord.updated_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    
    data = []
    for record, answered_count in result.all():
        tq = total_qs.get(record.survey_type, 1)
        progress = int((answered_count / tq) * 100) if tq > 0 else 0
        data.append({
            "id": record.id,
            "survey_type": record.survey_type,
            "house_number": record.house_number,
            "progress": progress,
            "updated_at": record.updated_at,
            "status": record.status
        })

    return {
        "items": data,
        "total": total_records,
        "skip": skip,
        "limit": limit
    }


@router.get("/submitted/all")
async def get_all_submitted(
    skip: int = 0,
    limit: int = 20,
    search: str = None,
    survey_type: str = None,
    db: AsyncSession = Depends(get_db), 
    user_data: tuple = Depends(get_current_student)
):
    current_user, community = user_data
    
    query = select(models.SurveyRecord).where(
        models.SurveyRecord.community_id == community.id,
        models.SurveyRecord.created_by_student_id == current_user.id, # As per rules: "A student should only see... Their own submitted surveys"
        models.SurveyRecord.status == "SUBMITTED"
    )
    
    if search:
        query = query.where(models.SurveyRecord.house_number.ilike(f"%{search}%"))
    if survey_type:
        query = query.where(models.SurveyRecord.survey_type == survey_type.upper())
        
    count_query = select(func.count()).select_from(query.subquery())
    total_records = (await db.execute(count_query)).scalar() or 0
    
    query = query.order_by(models.SurveyRecord.updated_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    
    data = []
    for record in result.scalars().all():
        data.append({
            "id": record.id,
            "survey_type": record.survey_type,
            "house_number": record.house_number,
            "submitted_at": record.updated_at,
            "updated_at": record.updated_at,
            "status": record.status
        })
        
    return {
        "items": data,
        "total": total_records,
        "skip": skip,
        "limit": limit
    }

@router.get("/questions")
async def get_survey_questions(
    type: str,
    db: AsyncSession = Depends(get_db),
    user_data: tuple = Depends(get_current_student)
):
    current_user, community = user_data
    q_type = type.upper()
    if q_type not in SURVEY_TYPES:
        raise HTTPException(status_code=400, detail="Invalid survey type")
        
    result = await db.execute(
        select(models.SurveyQuestion)
        .where(models.SurveyQuestion.survey_type == q_type)
        .order_by(models.SurveyQuestion.order_number)
    )
    return result.scalars().all()


@router.get("/{survey_type}")
async def get_surveys_by_type(
    survey_type: str,
    db: AsyncSession = Depends(get_db), 
    user_data: tuple = Depends(get_current_student)
):
    current_user, community = user_data
    s_type = survey_type.upper()
    if s_type not in SURVEY_TYPES:
        raise HTTPException(status_code=400, detail="Invalid survey type")
        
    result = await db.execute(
        select(models.SurveyRecord)
        .where(
            models.SurveyRecord.community_id == community.id,
            models.SurveyRecord.survey_type == s_type
        )
        .order_by(models.SurveyRecord.house_number)
    )
    return result.scalars().all()

@router.post("/create")
async def create_survey(
    payload: dict,
    db: AsyncSession = Depends(get_db), 
    user_data: tuple = Depends(get_current_student)
):
    current_user, community = user_data
    s_type = payload.get("survey_type", "").upper()
    if s_type not in SURVEY_TYPES:
        raise HTTPException(status_code=400, detail="Invalid survey type")
        
    from sqlalchemy.exc import IntegrityError
    
    clean_comm_name = re.sub(r'[^A-Za-z0-9]', '', community.name)
    
    # Retry mechanism for generating house number safely
    for _ in range(5):
        # Get count
        result = await db.execute(
            select(func.count())
            .where(
                models.SurveyRecord.community_id == community.id,
                models.SurveyRecord.survey_type == s_type
            )
        )
        count = result.scalar() or 0
        next_num = count + 1
        house_number = f"{clean_comm_name}/TTFPP/{next_num:04d}"
        
        record = models.SurveyRecord(
            community_id=community.id,
            created_by_student_id=current_user.id,
            survey_type=s_type,
            house_number=house_number,
            status="DRAFT"
        )
        db.add(record)
        try:
            await db.commit()
            await db.refresh(record)
            return record
        except IntegrityError:
            await db.rollback()
            continue
            
    raise HTTPException(status_code=500, detail="Failed to generate unique house number after multiple attempts")

@router.get("/record/{record_id}")
async def get_survey_record(
    record_id: str,
    db: AsyncSession = Depends(get_db), 
    user_data: tuple = Depends(get_current_student)
):
    current_user, community = user_data
    
    result = await db.execute(
        select(models.SurveyRecord)
        .where(models.SurveyRecord.id == record_id)
    )
    record = result.scalars().first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
        
    if record.community_id != community.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this community's records")
        
    # Fetch questions
    q_res = await db.execute(
        select(models.SurveyQuestion)
        .where(models.SurveyQuestion.survey_type == record.survey_type)
        .order_by(models.SurveyQuestion.order_number)
    )
    questions = q_res.scalars().all()
    
    # Fetch answers
    a_res = await db.execute(
        select(models.SurveyAnswer)
        .where(models.SurveyAnswer.survey_record_id == record.id)
    )
    answers = a_res.scalars().all()
    
    return {
        "record": record,
        "questions": questions,
        "answers": answers
    }

async def _save_answers(record_id: str, answers_data: List[Dict[str, Any]], db: AsyncSession, current_user, community):
    # Fetch record
    result = await db.execute(
        select(models.SurveyRecord).where(models.SurveyRecord.id == record_id)
    )
    record = result.scalars().first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
        
    if record.community_id != community.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if record.status == "SUBMITTED":
        raise HTTPException(status_code=400, detail="Cannot edit a submitted survey")
        
    if record.created_by_student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only edit your own drafts")
        
    # Delete existing answers
    await db.execute(
        delete(models.SurveyAnswer)
        .where(models.SurveyAnswer.survey_record_id == record.id)
    )
    
    # Insert new answers
    for ans in answers_data:
        db.add(models.SurveyAnswer(
            survey_record_id=record.id,
            question_id=ans["question_id"],
            answer=ans.get("answer")
        ))
        
    return record

@router.put("/record/{record_id}/draft")
async def save_survey_draft(
    record_id: str,
    payload: SurveyAnswerUpdate,
    db: AsyncSession = Depends(get_db), 
    user_data: tuple = Depends(get_current_student)
):
    current_user, community = user_data
    try:
        record = await _save_answers(record_id, payload.answers, db, current_user, community)
        await db.commit()
        return {"message": "Draft saved"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        error_details = traceback.format_exc()
        print("Draft Save Error:", error_details)
        raise HTTPException(status_code=500, detail=f"Draft Save Error: {str(e)}")

@router.post("/record/{record_id}/submit")
async def submit_survey(
    record_id: str,
    payload: SurveyAnswerUpdate,
    db: AsyncSession = Depends(get_db), 
    user_data: tuple = Depends(get_current_student)
):
    current_user, community = user_data
    record = await _save_answers(record_id, payload.answers, db, current_user, community)
    
    # Validate required fields
    q_res = await db.execute(
        select(models.SurveyQuestion)
        .where(models.SurveyQuestion.survey_type == record.survey_type)
    )
    questions = q_res.scalars().all()
    req_question_ids = {q.id for q in questions if q.required}
    
    provided_q_ids = {ans["question_id"] for ans in payload.answers if ans.get("answer") not in [None, "", []]}
    
    missing = req_question_ids - provided_q_ids
    if missing:
        # We don't rollback the saved answers, just prevent submission
        await db.commit()
        raise HTTPException(status_code=400, detail="Missing required fields")
        
    record.status = "SUBMITTED"
    await db.commit()
    return {"message": "Survey submitted successfully"}
