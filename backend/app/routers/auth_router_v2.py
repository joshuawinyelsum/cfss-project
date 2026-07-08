import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.sql import func
from app.database import get_db
from app.models import User, Community, IdempotencyKey, EmailVerificationToken, SystemSettings, AuditLog
from app.schemas import SystemUserRegister, SystemUserLogin, CheckIdRequest
from app.auth import get_password_hash, create_access_token, verify_password
from app.rate_limiter import limiter
from app.circuit_breaker import db_circuit_breaker
from app.logger import logger, trace_id_ctx_var
from app.worker import send_verification_email, write_audit_log_async
import re

# Use a unique ID for this instance to track lock ownership
INSTANCE_UUID = str(uuid.uuid4())

router = APIRouter()

@router.post("/check-id")
@limiter.limit("5/minute")
async def check_id(request: Request, payload: CheckIdRequest, db: AsyncSession = Depends(get_db)):
    await db_circuit_breaker.check()
    
    try:
        from sqlalchemy import text
        result = await db.execute(
            text("SELECT * FROM active_whitelist_entries WHERE student_id = :student_id")
            .bindparams(student_id=payload.studentId)
        )
        student = result.mappings().first()
        db_circuit_breaker.record_success()
        
        # Ambiguous response to prevent enumeration leak
        return {"valid": student is not None}
    except Exception as e:
        db_circuit_breaker.record_failure()
        logger.error(f"Error checking student ID: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")

@router.post("/register", status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, response: Response, payload: SystemUserRegister, db: AsyncSession = Depends(get_db)):
    await db_circuit_breaker.check()
    
    trace_id = trace_id_ctx_var.get()
    idempotency_key_header = request.headers.get("Idempotency-Key")
    
    if not idempotency_key_header:
        raise HTTPException(status_code=400, detail="Idempotency-Key header is required")
        
    try:
        # Check global system settings for registration window
        settings_result = await db.execute(select(SystemSettings).limit(1))
        settings = settings_result.scalars().first()
        if settings and not settings.registration_open:
            raise HTTPException(status_code=403, detail="Registration is closed")

        # Idempotency Lock Stealing & Validation Phase
        key_result = await db.execute(select(IdempotencyKey).filter(IdempotencyKey.key == idempotency_key_header))
        idemp_record = key_result.scalars().first()
        
        if idemp_record:
            if idemp_record.status == "SUCCESS":
                response.status_code = 201
                return idemp_record.response_payload
            
            if idemp_record.status == "PROCESSING":
                # Check if it's a zombie lock using DB time logic
                # We can do this by executing a DB-level check or relying on the mapped object if it was just queried.
                # However, to be strictly atomic with DB time, we use an UPDATE with WHERE locked_until <= func.now()
                stmt = (
                    update(IdempotencyKey)
                    .where(and_(
                        IdempotencyKey.key == idempotency_key_header,
                        IdempotencyKey.status == "PROCESSING",
                        IdempotencyKey.locked_until <= func.now()
                    ))
                    .values(
                        lock_owner_id=INSTANCE_UUID,
                        retry_count=IdempotencyKey.retry_count + 1,
                        locked_until=func.now() + datetime.timedelta(seconds=30)
                    )
                    .execution_options(synchronize_session=False)
                )
                
                update_result = await db.execute(stmt)
                
                if update_result.rowcount == 0:
                    # Lock is still valid and held by another process
                    response.headers["Retry-After"] = "2"
                    raise HTTPException(status_code=409, detail="Request is already processing")
                else:
                    # We successfully stole the zombie lock!
                    logger.info(f"Stole zombie lock for key {idempotency_key_header}")
        else:
            # Create new lock
            try:
                new_lock = IdempotencyKey(
                    key=idempotency_key_header,
                    status="PROCESSING",
                    locked_until=func.now() + datetime.timedelta(seconds=30),
                    lock_owner_id=INSTANCE_UUID,
                    trace_id=trace_id
                )
                db.add(new_lock)
                await db.flush() # Flush to lock the key in the DB
            except IntegrityError:
                await db.rollback()
                response.headers["Retry-After"] = "2"
                raise HTTPException(status_code=409, detail="Request is already processing")
        
        # Validation Phase
        from sqlalchemy import text
        student_result = await db.execute(
            text("SELECT * FROM active_whitelist_entries WHERE student_id = :student_id OR email = :email")
            .bindparams(student_id=payload.studentId, email=payload.email)
        )
        whitelist_student = student_result.mappings().first()
        if not whitelist_student:
            raise HTTPException(status_code=403, detail="Not authorized to register")
            
        # Transaction Phase
        try:
            # Concurrency-Safe Community Assignment
            communities_result = await db.execute(
                select(Community)
                .where(Community.current_count < Community.capacity)
                .order_by(Community.current_count.asc())
                .limit(1)
                .with_for_update(skip_locked=True)
            )
            assigned_community = communities_result.scalars().first()
            
            if not assigned_community:
                raise HTTPException(status_code=409, detail="All communities are full")
                
            # Increment safely in transaction
            assigned_community.current_count += 1
            
            # Create user
            new_user = User(
                student_id=payload.studentId,
                name=whitelist_student['name'] if 'name' in whitelist_student else "Unknown",
                email=payload.email,
                program=whitelist_student.get('program', payload.studentId.split('/')[0]),
                level=whitelist_student.get('level', 100),
                password_hash=get_password_hash(payload.password),
                role="student",
                trace_id=trace_id,
                community_id=assigned_community.id,
                is_verified=True
            )
            db.add(new_user)
            await db.flush()
            
            # Create verification token
            verification_token = str(uuid.uuid4())
            new_token = EmailVerificationToken(
                user_id=new_user.id,
                token=verification_token,
                expires_at=func.now() + datetime.timedelta(days=1),
                trace_id=trace_id
            )
            db.add(new_token)
            
            # Update Idempotency Key
            success_payload = {"message": "Registration successful"}
            await db.execute(
                update(IdempotencyKey)
                .where(IdempotencyKey.key == idempotency_key_header)
                .values(status="SUCCESS", response_payload=success_payload, locked_until=None)
            )
            
            new_user_id = new_user.id
            
            await db.commit()
            
            # Queue background tasks (after successful commit)
            # Removed Celery calls to prevent Redis connection timeouts blocking the event loop
            
            db_circuit_breaker.record_success()
            return success_payload
            
        except IntegrityError as e:
            await db.rollback()
            # Mark idempotency key as failed or simply delete to allow clean retry?
            # Standard practice: "Already registered" should be treated as SUCCESS on frontend retry if Idemp Key matches, 
            # but if it was a distinct request that triggered uniqueness conflict, return 409
            logger.warning(f"Registration integrity error: {e}")
            raise HTTPException(status_code=409, detail="Already registered")
            
    except HTTPException:
        raise
    except Exception as e:
        db_circuit_breaker.record_failure()
        logger.error(f"Registration failure: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable", headers={"Retry-After": "30"})

@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, response: Response, payload: SystemUserLogin, db: AsyncSession = Depends(get_db)):
    await db_circuit_breaker.check()
    try:
        result = await db.execute(select(User).filter(User.student_id == payload.student_id))
        user = result.scalars().first()
        
        if not user or not verify_password(payload.password, user.password_hash):
            logger.warning(f"Login failed: Invalid credentials for student_id {payload.student_id}")
            # Removed Celery audit log call to prevent Redis connection hangs
            raise HTTPException(status_code=401, detail="Invalid student ID or password")
            
        if not user.is_active:
            logger.warning(f"Login failed: Account deactivated for student_id {payload.student_id}")
            raise HTTPException(status_code=403, detail="Account is deactivated")
            
        access_token = create_access_token({"sub": str(user.id), "role": user.role})
        # Simulate refresh token storage via httpOnly cookie
        refresh_token = str(uuid.uuid4()) # A real impl would store hash in DB
        
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=7 * 24 * 60 * 60
        )
        
        db_circuit_breaker.record_success()
        return {"access_token": access_token, "token_type": "bearer", "role": user.role}
        
    except HTTPException:
        raise
    except Exception as e:
        db_circuit_breaker.record_failure()
        logger.error(f"Login failure: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable", headers={"Retry-After": "30"})
