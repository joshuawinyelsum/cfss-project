from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List

from app import schemas, models, auth
from app.database import get_db

router = APIRouter(prefix="/api/student", tags=["student"])

async def get_db_and_student(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not a student")
    if not current_user.community_id:
        raise HTTPException(status_code=403, detail="Student has no assigned community")
    return db, current_user

@router.get("/community/members", response_model=List[schemas.GroupMemberResponse])
async def get_community_members(deps: tuple = Depends(get_db_and_student)):
    db, current_user = deps
    # Security: only returns members of the authenticated student's own community.
    # Cross-group access is impossible — community_id is sourced from the JWT, not a query param.
    result = await db.execute(
        select(models.User, models.Community)
        .join(models.Community, models.User.community_id == models.Community.id)
        .filter(models.User.community_id == current_user.community_id)
        .filter(models.User.role == "student")
        .order_by(models.User.name)
    )
    members = []
    for user, community in result.all():
        members.append({
            "id": user.id,
            "student_id": user.student_id,
            "full_name": user.name,
            "faculty": user.faculty,
            "program": user.program,
            "gender": user.gender,
            "phone_number": user.phone_number,
            "community_name": community.name,
            "group_number": community.group_number,
        })
    return members


@router.post("/surveys", response_model=schemas.SurveyResponse)
async def submit_survey(survey: schemas.SurveySubmission, deps: tuple = Depends(get_db_and_student)):
    db, current_user = deps
    
    # Validation logic per schema
    if survey.type == "Household":
        pop = survey.data.get("population_total", 0)
        m = survey.data.get("male", 0)
        f = survey.data.get("female", 0)
        # Optional validation
        if pop < m + f:
            raise HTTPException(status_code=400, detail="Total population cannot be less than male + female")
    elif survey.type == "Education":
        dropout = survey.data.get("dropout_rate", 0)
        if dropout < 0 or dropout > 100:
            raise HTTPException(status_code=400, detail="Dropout rate must be between 0 and 100")
            
    # Deduplication check (Idempotency)
    existing_result = await db.execute(
        select(models.Survey).filter(models.Survey.unique_submission_id == survey.unique_submission_id)
    )
    existing_survey = existing_result.scalars().first()
    if existing_survey:
        # If it already exists, return the existing one. Do not overwrite.
        return existing_survey

    new_survey = models.Survey(
        unique_submission_id=survey.unique_submission_id,
        user_id=current_user.id,
        community_id=current_user.community_id,
        type=survey.type,
        data=survey.data,
        status="submitted"
    )
    db.add(new_survey)
    await db.commit()
    await db.refresh(new_survey)
    return new_survey

@router.get("/surveys", response_model=List[schemas.SurveyResponse])
async def get_community_surveys(skip: int = 0, limit: int = 100, deps: tuple = Depends(get_db_and_student)):
    db, current_user = deps
    result = await db.execute(
        select(models.Survey)
        .filter(models.Survey.community_id == current_user.community_id)
        .order_by(models.Survey.created_at.desc())
        .offset(skip).limit(limit)
    )
    return result.scalars().all()

@router.get("/community/stats")
async def get_community_stats(deps: tuple = Depends(get_db_and_student)):
    db, current_user = deps
    
    # Query the modern SurveyRecord table instead of the deprecated Survey table
    result = await db.execute(
        select(models.SurveyRecord.survey_type, func.count(models.SurveyRecord.id))
        .filter(
            models.SurveyRecord.community_id == current_user.community_id,
            models.SurveyRecord.created_by_student_id == current_user.id,
            models.SurveyRecord.status == "SUBMITTED"
        )
        .group_by(models.SurveyRecord.survey_type)
    )
    counts = dict(result.all())
    
    # Map to the frontend's expected structure
    stats = {
        "household": {"total": counts.get("HOUSEHOLD", 0), "population": 0},
        "education": {"total": counts.get("EDUCATION", 0), "schools": counts.get("EDUCATION", 0)},
        "health": {"total": counts.get("HEALTH", 0), "hospitals": counts.get("HEALTH", 0)},
        "governance": {"total": counts.get("GOVERNANCE", 0), "water_access": counts.get("GOVERNANCE", 0)}
    }
    
    total_surveys = sum(counts.values())
                
    return {
        "community_id": current_user.community_id,
        "total_surveys": total_surveys,
        "summary": stats
    }
