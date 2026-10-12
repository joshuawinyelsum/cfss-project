import csv
import io
import json
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.auth import get_current_admin
from typing import Optional
from sqlalchemy import func, or_
from app.models import WhitelistEntry, WhitelistV2, Survey, Community, User, SurveyRecord, SurveyAnswer, SurveyQuestion

router = APIRouter(prefix="/admin/export", tags=["admin", "export"])

@router.get("/students")
async def export_students(db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    """Export students as CSV using batching."""
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["student_id", "name", "email", "program", "level", "is_verified", "created_at"])
    
    query = select(User).filter(User.role == "student").order_by(User.id)
    
    batch_size = 1000
    offset = 0
    
    while True:
        result = await db.execute(query.limit(batch_size).offset(offset))
        users = result.scalars().all()
        if not users:
            break
        
        for user in users:
            created_at_str = user.created_at.isoformat() if user.created_at else ""
            writer.writerow([
                user.student_id,
                user.name,
                user.email,
                user.program,
                user.level,
                user.is_verified,
                created_at_str
            ])
            
        offset += batch_size

    headers = {
        "Content-Disposition": "attachment; filename=students_export.csv"
    }
    return Response(content=output.getvalue(), media_type="text/csv", headers=headers)

@router.get("/whitelist/{whitelist_id}")
async def export_whitelist(whitelist_id: int, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    """Export a whitelist as CSV."""
    result = await db.execute(select(WhitelistV2).filter(WhitelistV2.id == whitelist_id))
    whitelist = result.scalars().first()
    if not whitelist:
        raise HTTPException(status_code=404, detail="Whitelist not found")

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["student_id", "full_name", "email", "phone_number", "gender", "faculty", "program", "level"])

    query = select(WhitelistEntry).filter(WhitelistEntry.whitelist_id == whitelist_id).order_by(WhitelistEntry.id)

    batch_size = 1000
    offset = 0

    while True:
        res = await db.execute(query.limit(batch_size).offset(offset))
        entries = res.scalars().all()
        if not entries:
            break

        for entry in entries:
            writer.writerow([
                entry.student_id or "",
                entry.full_name or "",
                entry.email or "",
                entry.phone_number or "",
                entry.gender or "",
                entry.faculty or "",
                entry.program or "",
                entry.level if entry.level is not None else "",
            ])

        offset += batch_size

    headers = {
        "Content-Disposition": f"attachment; filename=whitelist_{whitelist_id}.csv"
    }
    return Response(content=output.getvalue(), media_type="text/csv", headers=headers)


@router.get("/surveys")
async def export_surveys(
    community_id: Optional[int] = None,
    survey_type: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Export field surveys as CSV with comprehensive details and responses."""
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Record ID",
        "Community",
        "Group Number",
        "Student Name",
        "Student ID",
        "Student Email",
        "Survey Type",
        "Entity ID",
        "Status",
        "Sync Status",
        "Submitted At",
        "Created At",
        "Responses"
    ])
    
    query = (
        select(SurveyRecord, User, Community)
        .join(User, SurveyRecord.created_by_student_id == User.id)
        .join(Community, SurveyRecord.community_id == Community.id)
    )

    if status:
        query = query.where(SurveyRecord.status == status.upper())
    else:
        query = query.where(SurveyRecord.status != "DELETED")

    if community_id is not None:
        query = query.where(SurveyRecord.community_id == community_id)

    if survey_type:
        query = query.where(func.upper(SurveyRecord.survey_type) == survey_type.upper())

    query = query.order_by(SurveyRecord.submitted_at.desc().nulls_last(), SurveyRecord.created_at.desc())
    
    batch_size = 500
    offset = 0
    total_written = 0
    
    while True:
        result = await db.execute(query.limit(batch_size).offset(offset))
        results = result.all()
        if not results:
            break
            
        record_ids = [s.id for s, _, _ in results]
        answers_res = await db.execute(
            select(SurveyAnswer.survey_record_id, SurveyQuestion.question_text, SurveyAnswer.answer)
            .join(SurveyQuestion, SurveyAnswer.question_id == SurveyQuestion.id)
            .where(SurveyAnswer.survey_record_id.in_(record_ids))
        )
        record_answers = {}
        for rec_id, q_text, ans in answers_res.all():
            if rec_id not in record_answers:
                record_answers[rec_id] = {}
            record_answers[rec_id][q_text] = ans
            
        for survey, user, community in results:
            submitted_at_str = survey.submitted_at.isoformat() if survey.submitted_at else ""
            created_at_str = survey.created_at.isoformat() if survey.created_at else ""
            answers_json = json.dumps(record_answers.get(survey.id, {}))
            
            writer.writerow([
                survey.id,
                community.name,
                community.group_number,
                user.name,
                user.student_id,
                user.email or "",
                survey.survey_type,
                survey.entity_id or "",
                survey.status,
                survey.sync_status,
                submitted_at_str,
                created_at_str,
                answers_json
            ])
            total_written += 1
            
        offset += batch_size

    # Fallback to legacy Survey if no SurveyRecord items were found
    if total_written == 0 and not community_id and not survey_type and not status:
        legacy_query = (
            select(Survey, User, Community)
            .join(User, Survey.user_id == User.id)
            .join(Community, Survey.community_id == Community.id)
            .order_by(Survey.id)
        )
        res = await db.execute(legacy_query)
        for s, u, c in res.all():
            writer.writerow([
                str(s.id),
                c.name,
                c.group_number,
                u.name,
                u.student_id,
                u.email or "",
                s.type,
                "",
                s.status,
                "synced",
                s.created_at.isoformat() if s.created_at else "",
                s.created_at.isoformat() if s.created_at else "",
                json.dumps(s.data or {})
            ])

    filename_parts = ["surveys_export"]
    if survey_type:
        filename_parts.append(survey_type.lower())
    if community_id:
        filename_parts.append(f"comm_{community_id}")
    filename = "_".join(filename_parts) + ".csv"

    headers = {
        "Content-Disposition": f"attachment; filename={filename}"
    }
    return Response(content=output.getvalue(), media_type="text/csv", headers=headers)
