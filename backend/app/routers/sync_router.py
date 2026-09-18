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

@router.post("/operations")
async def sync_operations(
    payload: SyncOperationsPayload,
    db: AsyncSession = Depends(get_db),
    user_data: tuple = Depends(get_current_student)
):
    current_user, community = user_data
    curr_user_id = current_user.id
    comm_id = community.id
    comm_name = community.name
    results = []
    
    for op in payload.operations:
        try:
            if op.entity_type != "SURVEY":
                raise ValueError(f"Unsupported entity type {op.entity_type}")
                
            # Check if record exists
            result = await db.execute(select(models.SurveyRecord).where(models.SurveyRecord.id == op.entity_id))
            record = result.scalars().first()
            
            if op.operation_type == "DELETE":
                if record:
                    if record.created_by_student_id != curr_user_id:
                        raise ValueError("Not authorized to delete this survey")
                    # Soft delete
                    record.status = "DELETED"
                    record.last_synced_at = func.now()
                    await db.commit()
                
                results.append({
                    "operation_id": op.operation_id,
                    "success": True,
                    "action": "deleted"
                })
                
            elif op.operation_type in ["CREATE", "UPDATE"]:
                survey_data = op.payload or {}
                
                if record:
                    # Update
                    if record.created_by_student_id != curr_user_id:
                        raise ValueError("Not authorized to edit this survey")
                    if record.status == "DELETED":
                        raise ValueError("Cannot update a deleted survey")
                    
                    record.status = survey_data.get("status", record.status)
                    record.last_synced_at = func.now()
                    
                    # Parse dates if they are strings
                    def parse_dt(dt_val):
                        if isinstance(dt_val, str):
                            try:
                                return datetime.fromisoformat(dt_val.replace('Z', '+00:00'))
                            except ValueError:
                                return None
                        return dt_val
                        
                    if survey_data.get("submitted_at"):
                        record.submitted_at = parse_dt(survey_data.get("submitted_at"))
                    if survey_data.get("updated_at"):
                        record.updated_at = parse_dt(survey_data.get("updated_at"))
                    
                    await db.execute(delete(models.SurveyAnswer).where(models.SurveyAnswer.survey_record_id == record.id))
                    
                else:
                    # CREATE (or UPSERT if missing)
                    survey_type = survey_data.get("survey_type", "HOUSEHOLD").upper()
                    
                    from app.routers.student_surveys import get_entity_prefix
                    prefix = get_entity_prefix(survey_type)
                    clean_comm_name = re.sub(r'[^A-Za-z0-9]', '', comm_name)
                    
                    # Use transactional counter for safe concurrent ID generation
                    counter_res = await db.execute(
                        select(models.SurveyCounter).where(
                            models.SurveyCounter.community_id == comm_id,
                            models.SurveyCounter.survey_type == survey_type
                        ).with_for_update()
                    )
                    counter = counter_res.scalars().first()
                    
                    if not counter:
                        counter = models.SurveyCounter(
                            community_id=comm_id,
                            survey_type=survey_type,
                            last_count=1
                        )
                        db.add(counter)
                        next_num = 1
                    else:
                        counter.last_count += 1
                        next_num = counter.last_count
                    
                    entity_id = f"{clean_comm_name}/TTFPP/{prefix}{next_num:04d}"
                    
                    def parse_dt(dt_val):
                        if isinstance(dt_val, str):
                            try:
                                return datetime.fromisoformat(dt_val.replace('Z', '+00:00'))
                            except ValueError:
                                return None
                        return dt_val
                    
                    record = models.SurveyRecord(
                        id=op.entity_id,
                        community_id=comm_id,
                        created_by_student_id=curr_user_id,
                        survey_type=survey_type,
                        entity_id=entity_id,
                        status=survey_data.get("status", "DRAFT"),
                        sync_status="synced",
                        last_synced_at=func.now(),
                        submitted_at=parse_dt(survey_data.get("submitted_at")),
                        created_at=parse_dt(survey_data.get("created_at")),
                        updated_at=parse_dt(survey_data.get("updated_at"))
                    )
                    db.add(record)
                    
                # Insert answers for both CREATE and UPDATE
                for ans in survey_data.get("answers", []):
                    db.add(models.SurveyAnswer(
                        survey_record_id=record.id,
                        question_id=ans.get("question_id"),
                        answer=ans.get("answer")
                    ))
                    
                await db.commit()
                await db.refresh(record)
                rec_id = record.id
                rec_entity_id = record.entity_id
                
                # Admin Notification on SUBMITTED
                if record.status == "SUBMITTED":
                    notif = models.AdminNotification(
                        type="survey_submit",
                        title="Survey Submitted",
                        message=f"{current_user.name} submitted {record.survey_type.capitalize()} Survey\nCommunity: {comm_name}\nEntity ID: {rec_entity_id}"
                    )
                    db.add(notif)
                    await db.commit()
                
                results.append({
                    "operation_id": op.operation_id,
                    "server_id": rec_id,
                    "house_number": rec_entity_id,
                    "success": True,
                    "action": "upserted"
                })
                
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            await db.rollback()
            results.append({
                "operation_id": op.operation_id,
                "success": False,
                "error": str(e)
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
        models.SurveyRecord.created_by_student_id == current_user.id,
        models.SurveyRecord.status != "DELETED"
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
            "submitted_at": record.submitted_at.isoformat() if record.submitted_at else (record.updated_at.isoformat() if record.status == "SUBMITTED" and record.updated_at else None)
        })
        
    return {"surveys": surveys}
