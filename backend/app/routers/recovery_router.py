from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from pydantic import BaseModel, EmailStr
import secrets
import hashlib
import re
from app.rate_limiter import limiter
import datetime
import os
import uuid
from app.database import get_db
from app.models import User, PasswordResetToken
from app.auth import get_password_hash
from app.logger import logger
from app.worker import send_password_reset_email

router = APIRouter(prefix="/api/v2/auth", tags=["auth"])

class RecoverRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_new_password: str

@router.post("/recover")
@limiter.limit("3/15minutes")
async def request_password_reset(request: Request, payload: RecoverRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == payload.email))
    user = result.scalars().first()
    
    if user:
        # Invalidate any old tokens for this user
        await db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user.id))
        
        # Generate cryptographically secure token
        raw_token = secrets.token_urlsafe(32)
        hashed_token = hashlib.sha256(raw_token.encode()).hexdigest()
        expires = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)
        
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=hashed_token,
            expires_at=expires
        )
        db.add(reset_token)
        await db.commit()
        
        # Construct reset URL
        frontend_url = os.getenv("FRONTEND_URL")
        if not frontend_url:
            # We explicitly require this to be configured in production (e.g. https://cfss.app)
            # and in development (e.g. http://localhost:3000). We no longer rely on origin headers.
            raise HTTPException(status_code=500, detail="FRONTEND_URL environment variable is not configured. Cannot generate recovery link.")
            
        reset_url = f"{frontend_url.rstrip('/')}/reset-password?token={raw_token}"
        
        # Dispatch to celery
        trace_id = str(uuid.uuid4())
        send_password_reset_email.delay(email=payload.email, reset_url=reset_url, trace_id=trace_id)
        
    # We must not reveal if the account exists, so we always return success.
    return {"message": "If an account exists for that email, you'll receive a password reset link shortly."}

@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    hashed_token = hashlib.sha256(payload.token.encode()).hexdigest()
    
    result = await db.execute(select(PasswordResetToken).filter(PasswordResetToken.token == hashed_token))
    token_obj = result.scalars().first()
    
    if not token_obj:
        raise HTTPException(status_code=400, detail="Invalid or expired recovery token")
        
    if token_obj.expires_at.replace(tzinfo=datetime.timezone.utc) < datetime.datetime.now(datetime.timezone.utc):
        await db.delete(token_obj)
        await db.commit()
        raise HTTPException(status_code=400, detail="Invalid or expired recovery token")
        
    user_result = await db.execute(select(User).filter(User.id == token_obj.user_id))
    user = user_result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired recovery token")
        
    if payload.new_password != payload.confirm_new_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    if user.role == "student":
        if len(payload.new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    else:
        if len(payload.new_password) < 8 or not re.match(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$", payload.new_password):
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character")
            
    user.password_hash = get_password_hash(payload.new_password)
    db.add(user)
    
    # Delete token so it can't be reused
    await db.delete(token_obj)
    await db.commit()
    
    return {"message": "Password updated successfully"}
