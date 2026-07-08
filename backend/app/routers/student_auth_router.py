import re
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, exc
from datetime import datetime, timedelta
from typing import Optional

from app import schemas, models, auth
from app.database import get_db
from app.logger import logger
from app.rate_limiter import limiter

router = APIRouter(prefix="/api/v2/students", tags=["student_auth"])

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register_student(request: Request, data: schemas.StudentRegister, db: AsyncSession = Depends(get_db)):
    try:
        # 1. Check SystemSettings.registration_open
        settings = (await db.execute(select(models.SystemSettings))).scalars().first()
        if not settings or not settings.registration_open:
            raise HTTPException(status_code=403, detail="Registration is closed")

        # 2. Normalize
        student_id = re.sub(r'\s+', ' ', data.student_id.strip().upper())
        program = re.sub(r'\s+', ' ', data.program.strip().lower())
        logger.info(f"Register attempt: student_id={student_id}, program={program}")

        # 4. Query WhitelistEntry
        stmt = select(models.WhitelistEntry).join(
            models.WhitelistV2, models.WhitelistEntry.whitelist_id == models.WhitelistV2.id
        ).where(
            models.WhitelistV2.status == 'ACTIVE',
            models.WhitelistEntry.student_id == student_id
        )
        entry = (await db.execute(stmt)).scalars().first()
        
        if not entry:
            raise HTTPException(status_code=403, detail="Not authorized")

        # 5. Compare program
        if not entry.program or entry.program != program:
            logger.warning(f"Program mismatch: got={program}, expected={entry.program}")
            raise HTTPException(status_code=400, detail="Program mismatch")

        # 6. Check User WHERE student_id = normalized
        existing_user = (await db.execute(select(models.User).where(models.User.student_id == student_id))).scalars().first()
        if existing_user:
            raise HTTPException(status_code=409, detail="Already registered")

        # 7. Assign community using DYNAMIC COUNT
        student_count_subq = (
            select(func.count(models.User.id))
            .where(models.User.community_id == models.Community.id)
            .correlate(models.Community)
            .scalar_subquery()
        )

        stmt_community = (
            select(models.Community)
            .where(student_count_subq < models.Community.capacity)
            .order_by(student_count_subq.asc())
            .limit(1)
            .with_for_update() # Blocking lock
        )
        community = (await db.execute(stmt_community)).scalars().first()

        if not community:
            raise HTTPException(status_code=409, detail="All communities full")

        # 8. Create User
        new_user = models.User(
            student_id=student_id,
            name=entry.full_name or student_id,
            program=entry.program,
            password_hash=auth.get_password_hash(data.password),
            role="student",
            is_active=True,
            community_id=community.id,
            email=None,
            level=0,
            is_verified=True
        )
        db.add(new_user)
        
        # Flush to get the id without releasing the for_update lock immediately
        try:
            await db.flush() 
        except exc.IntegrityError:
            await db.rollback()
            raise HTTPException(status_code=409, detail="Already registered")
            
        # 9. Reconcile current_count
        count_after = (await db.execute(
            select(func.count(models.User.id)).where(models.User.community_id == community.id)
        )).scalar()
        
        community.current_count = count_after
        community_name = community.name
        
        try:
            await db.commit()
        except exc.IntegrityError:
            await db.rollback()
            raise HTTPException(status_code=409, detail="Already registered")
        
        logger.info(f"Registration success: {student_id} -> {community_name}")
        return {"message": "Registration successful"}

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/login", response_model=schemas.Token)
@limiter.limit("5/minute")
async def login_student(request: Request, data: schemas.StudentLogin, db: AsyncSession = Depends(get_db)):
    try:
        student_id = data.student_id.strip().upper()
        logger.info(f"Login attempt: student_id={student_id}")

        user = (await db.execute(select(models.User).where(models.User.student_id == student_id))).scalars().first()
        
        if not user or not auth.verify_password(data.password, user.password_hash):
            logger.warning(f"Login failed: bad password or non-existent user for {student_id}")
            raise HTTPException(status_code=401, detail="Invalid student ID or password")

        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is deactivated")

        access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth.create_access_token(
            data={"sub": str(user.id), "role": user.role}, expires_delta=access_token_expires
        )

        logger.info(f"Login success: {student_id}")
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during login: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/me", response_model=schemas.StudentMeResponse)
async def get_student_me(current_user: models.User = Depends(auth.get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        community = None
        if current_user.community_id:
            community = (await db.execute(
                select(models.Community).where(models.Community.id == current_user.community_id)
            )).scalars().first()

        return {
            "student_id": current_user.student_id,
            "full_name": current_user.name,
            "program": current_user.program or "",
            "community": community.name if community else None,
            "community_id": current_user.community_id,
            "group_number": community.group_number if community else None,
            "registered_at": current_user.created_at.isoformat() if current_user.created_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in /me: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
