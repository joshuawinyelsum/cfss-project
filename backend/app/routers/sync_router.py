from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, delete
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import re

from app import models, auth
from app.database import get_db

router = APIRouter(prefix="/api/sync", tags=["sync"])

class SyncAnswer(BaseModel):
    question_id: str
    answer: Any

class SyncSurvey(BaseModel):
    survey_id: str
    survey_type: str
    community_id: int
    house_number: Optional[str] = None
    answers: List[SyncAnswer]
    status: str
    submitted_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class SyncPayload(BaseModel):
    surveys: List[SyncSurvey]

async def get_current_student(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not a student")
    if not current_user.community_id:
        raise HTTPException(status_code=403, detail="Student has no assigned community")
    
    result = await db.execute(select(models.Community).filter(models.Community.id == current_user.community_id))
    community = result.scalars().first()
    if not community:
        raise HTTPException(status_code=403, detail="Community not found")
        
    return current_user, community

@router.post("/surveys")
async def sync_surveys(
    payload: SyncPayload,
    db: AsyncSession = Depends(get_db),
    user_data: tuple = Depends(get_current_student)
):
    current_user, community = user_data
    
    comm_id = community.id
    comm_name = community.name
    curr_user_id = current_user.id
    curr_user_name = current_user.name
    
    results = []
    
    for survey in payload.surveys:
        try:
            # Validate community
            if survey.community_id != comm_id:
                raise ValueError("Survey community mismatch")
                
            # Check if survey exists
            result = await db.execute(select(models.SurveyRecord).where(models.SurveyRecord.id == survey.survey_id))
            record = result.scalars().first()
            
            if record:
                # Update existing
                if record.created_by_student_id != curr_user_id:
                    raise ValueError("Not authorized to edit this survey")
                    
                if record.status == "SUBMITTED" and survey.status != "SUBMITTED":
                    raise ValueError("Cannot revert a submitted survey")
                    
                record.status = survey.status
                record.sync_status = "synced"
                record.last_synced_at = func.now()
                record.sync_error = None
                if survey.updated_at:
                    record.updated_at = survey.updated_at
                
                # Update answers
                await db.execute(delete(models.SurveyAnswer).where(models.SurveyAnswer.survey_record_id == record.id))
            else:
                # Create new
                entity_id = survey.house_number
                
                # If no entity_id (offline creation), generate one
                if not entity_id or entity_id.startswith("TEMP"):
                    from app.routers.student_surveys import get_entity_prefix
                    clean_comm_name = re.sub(r'[^A-Za-z0-9]', '', comm_name)
                    prefix = get_entity_prefix(survey.survey_type.upper())
                    
                    # Robust logic for unique entity_id
                    count_res = await db.execute(
                        select(func.count()).where(
                            models.SurveyRecord.community_id == comm_id,
                            models.SurveyRecord.survey_type == survey.survey_type.upper()
                        )
                    )
                    count = count_res.scalar() or 0
                    next_num = count + 1
                    
                    while True:
                        generated_num = f"{clean_comm_name}/TTFPP/{prefix}{next_num:04d}"
                        
                        # Verify uniqueness in DB just in case
                        existing_hn = await db.execute(
                            select(models.SurveyRecord.id).where(
                                models.SurveyRecord.entity_id == generated_num
                            )
                        )
                        if not existing_hn.scalars().first():
                            entity_id = generated_num
                            break
                        next_num += 1
                            
                    if not entity_id or entity_id.startswith("TEMP"):
                        raise ValueError("Failed to generate unique entity id")

                record = models.SurveyRecord(
                    id=survey.survey_id,
                    community_id=comm_id,
                    created_by_student_id=curr_user_id,
                    survey_type=survey.survey_type.upper(),
                    entity_id=entity_id,
                    status=survey.status,
                    sync_status="synced",
                    last_synced_at=func.now(),
                    sync_error=None
                )
                if survey.created_at:
                    record.created_at = survey.created_at
                if survey.updated_at:
                    record.updated_at = survey.updated_at
                    
                db.add(record)
            
            # Insert new answers
            for ans in survey.answers:
                db.add(models.SurveyAnswer(
                    survey_record_id=record.id,
                    question_id=ans.question_id,
                    answer=ans.answer
                ))
                
            # Extract attributes before commit to avoid lazy load MissingGreenlet
            rec_id = record.id
            rec_entity_id = record.entity_id
            rec_survey_type = record.survey_type
            
            await db.commit()
            
            # Admin Notification on SUBMITTED
            if survey.status == "SUBMITTED":
                notif = models.AdminNotification(
                    type="survey_submit",
                    title="Survey Submitted",
                    message=f"{curr_user_name} submitted {rec_survey_type.capitalize()} Survey\nCommunity: {comm_name}\nEntity ID: {rec_entity_id}"
                )
                db.add(notif)
                await db.commit()
                
            results.append({
                "client_id": survey.survey_id,
                "server_id": rec_id,
                "house_number": rec_entity_id,
                "success": True
            })
            
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            await db.rollback()
            # Update sync error if record existed? Too complex to do in the same loop if rollback happens.
            results.append({
                "client_id": survey.survey_id,
                "success": False,
                "error": f"{str(e)}\n{tb}"
            })
            
    return {"success": True, "results": results}


@router.get("/status")
async def get_sync_status(
    db: AsyncSession = Depends(get_db),
    user_data: tuple = Depends(get_current_student)
):
    current_user, community = user_data
    
    # We fetch the backend view of the student's surveys
    res = await db.execute(
        select(models.SurveyRecord.status, func.count(models.SurveyRecord.id))
        .where(models.SurveyRecord.created_by_student_id == current_user.id)
        .group_by(models.SurveyRecord.status)
    )
    counts = dict(res.all())
    
    # Note: Pending/Failed syncs are mostly tracked on frontend, but we can return total backed up records.
    # The frontend will merge this with its local IndexedDB queue sizes.
    total = sum(counts.values())
    
    last_sync_res = await db.execute(
        select(func.max(models.SurveyRecord.last_synced_at))
        .where(models.SurveyRecord.created_by_student_id == current_user.id)
    )
    last_sync = last_sync_res.scalar()
    
    return {
        "server_total": total,
        "server_drafts": counts.get("DRAFT", 0),
        "server_submitted": counts.get("SUBMITTED", 0),
        "last_synced_at": last_sync.isoformat() if last_sync else None
    }

@router.get("/download")
async def download_surveys(
    db: AsyncSession = Depends(get_db),
    user_data: tuple = Depends(get_current_student)
):
    current_user, community = user_data
    
    query = select(models.SurveyRecord).where(
        models.SurveyRecord.created_by_student_id == current_user.id
    )
    result = await db.execute(query)
    records = result.scalars().all()
    
    surveys = []
    for record in records:
        ans_query = select(models.SurveyAnswer).where(models.SurveyAnswer.survey_record_id == record.id)
        ans_res = await db.execute(ans_query)
        answers = ans_res.scalars().all()
        
        surveys.append({
            "survey_id": record.id,
            "survey_type": record.survey_type,
            "community_id": record.community_id,
            "house_number": record.entity_id,
            "status": record.status,
            "answers": [{"question_id": a.question_id, "answer": a.answer} for a in answers],
            "created_at": record.created_at.isoformat() if record.created_at else None,
            "updated_at": record.updated_at.isoformat() if record.updated_at else None,
            "submitted_at": record.updated_at.isoformat() if record.status == "SUBMITTED" and record.updated_at else None
        })
        
    return {"surveys": surveys}
