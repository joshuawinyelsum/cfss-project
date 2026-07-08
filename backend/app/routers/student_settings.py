from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError

from app import models, auth, schemas
from app.database import get_db

router = APIRouter(tags=["student_settings"])

@router.post("/api/student/settings/change-password")
async def change_password(
    payload: schemas.ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not authorized as student")

    # Verify current password
    if not auth.verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    # Update password
    current_user.password_hash = auth.get_password_hash(payload.new_password)
    db.add(current_user)
    await db.commit()
    
    return {"message": "Password changed successfully"}

@router.get("/api/student/settings")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not authorized as student")

    result = await db.execute(select(models.StudentPreference).where(models.StudentPreference.student_id == current_user.id))
    pref = result.scalars().first()
    
    if not pref:
        return {"theme": "light"}
        
    return {"theme": pref.theme}

@router.patch("/api/student/settings")
async def update_settings(
    payload: schemas.ThemeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not authorized as student")

    result = await db.execute(select(models.StudentPreference).where(models.StudentPreference.student_id == current_user.id))
    pref = result.scalars().first()
    
    if not pref:
        pref = models.StudentPreference(student_id=current_user.id, theme=payload.theme)
        db.add(pref)
    else:
        pref.theme = payload.theme
        
    await db.commit()
    
    return {"theme": pref.theme}
