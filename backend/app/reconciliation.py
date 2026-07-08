import asyncio
import datetime
from sqlalchemy.future import select
from sqlalchemy import update, and_
from sqlalchemy.sql import func
from app.database import SessionLocal
from app.models import IdempotencyKey, SystemUser, EmailVerificationToken
from app.logger import logger

async def run_reconciliation():
    """
    Self-healing reconciliation engine.
    Finds PROCESSING locks that are old but haven't successfully completed or failed.
    """
    logger.info("Starting reconciliation cycle")
    
    async with SessionLocal() as db:
        # Find stuck processing locks older than 5 minutes
        stuck_threshold = datetime.datetime.utcnow() - datetime.timedelta(minutes=5)
        
        # 1. Clean up stale idempotency keys
        stmt_stuck_keys = (
            update(IdempotencyKey)
            .where(and_(
                IdempotencyKey.status == "PROCESSING",
                IdempotencyKey.created_at < stuck_threshold
            ))
            .values(
                status="FAILED",
                response_payload={"message": "System timeout during processing"}
            )
            .execution_options(synchronize_session=False)
        )
        
        result_stuck = await db.execute(stmt_stuck_keys)
        if result_stuck.rowcount > 0:
            logger.warning(f"Reconciliation: marked {result_stuck.rowcount} stuck idempotency keys as FAILED")
            
        # 2. Check for orphaned users (user created but no token generated)
        # This is rare since we use a transaction boundary, but for strict consistency:
        stuck_user_threshold = datetime.datetime.utcnow() - datetime.timedelta(minutes=10)
        users_result = await db.execute(
            select(SystemUser)
            .outerjoin(EmailVerificationToken, SystemUser.id == EmailVerificationToken.user_id)
            .where(and_(
                SystemUser.is_verified == False,
                SystemUser.created_at < stuck_user_threshold,
                EmailVerificationToken.id == None
            ))
        )
        
        orphaned_users = users_result.scalars().all()
        for user in orphaned_users:
            import uuid
            logger.warning(f"Reconciliation: Generating missing verification token for user {user.id}")
            verification_token = str(uuid.uuid4())
            new_token = EmailVerificationToken(
                user_id=user.id,
                token=verification_token,
                expires_at=func.now() + datetime.timedelta(days=1),
                trace_id="RECONCILIATION"
            )
            db.add(new_token)
            
            # Send email
            from app.worker import send_verification_email
            send_verification_email.delay(user.id, user.email, verification_token, "RECONCILIATION")
            
        await db.commit()
        logger.info("Reconciliation cycle complete")

if __name__ == "__main__":
    asyncio.run(run_reconciliation())
