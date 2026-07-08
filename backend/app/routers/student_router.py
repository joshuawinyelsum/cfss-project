from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
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

@router.get("/community/members", response_model=List[schemas.UserResponse])
async def get_community_members(deps: tuple = Depends(get_db_and_student)):
    db, current_user = deps
    result = await db.execute(
        select(models.User)
        .filter(models.User.community_id == current_user.community_id)
        .filter(models.User.role == "student")
    )
    return result.scalars().all()

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
    result = await db.execute(
        select(models.Survey)
        .filter(models.Survey.community_id == current_user.community_id)
    )
    surveys = result.scalars().all()
    
    # This generates report stats
    stats = {
        "household": {"total": 0, "population": 0},
        "education": {"total": 0, "schools": 0},
        "health": {"total": 0, "hospitals": 0},
        "governance": {"total": 0, "water_access": 0}
    }
    
    for s in surveys:
        if s.type == "Household":
            stats["household"]["total"] += 1
            stats["household"]["population"] += s.data.get("population_total", 0)
        elif s.type == "Education":
            stats["education"]["total"] += 1
            stats["education"]["schools"] += s.data.get("number_of_schools", 0)
        elif s.type == "Health":
            stats["health"]["total"] += 1
            stats["health"]["hospitals"] += s.data.get("hospitals", 0)
        elif s.type == "Governance":
            stats["governance"]["total"] += 1
            if s.data.get("water_access"):
                stats["governance"]["water_access"] += 1
                
    return {
        "community_id": current_user.community_id,
        "total_surveys": len(surveys),
        "summary": stats
    }
