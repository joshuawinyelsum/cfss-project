from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import timedelta

from app import schemas, models, auth
from app.database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/student/login", response_model=schemas.Token)
async def student_login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).filter(models.User.student_id == form_data.username))
    user = result.scalars().first()
    
    if not user or user.role != "student" or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect student ID or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": str(user.id), "role": "student"}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/admin/login", response_model=schemas.Token)
async def admin_login(form_data: OAuth2PasswordRequestForm = Depends()):
    if form_data.username != "admin" or form_data.password != "admin123":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect admin credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": "0", "role": "admin"}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: models.User = Depends(auth.get_current_user), db: AsyncSession = Depends(get_db)):
    # Prepare the response, populating group_label from Community if student
    response = schemas.UserResponse.model_validate(current_user)
    if current_user.community_id:
        comm_result = await db.execute(select(models.Community).filter(models.Community.id == current_user.community_id))
        community = comm_result.scalars().first()
        if community:
            response.group_label = f"Group {community.group_number}"
            response.community_name = community.name
            response.group_number = community.group_number
            response.district = community.district
            response.region = community.region
    return response
