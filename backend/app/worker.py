import os
from celery import Celery
from app.logger import logger, trace_id_ctx_var
import json

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "cfss_worker",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_reject_on_worker_lost=True,
    task_acks_late=True,
    broker_connection_retry_on_startup=False,
    task_publish_retry=False,
    broker_transport_options={'max_retries': 0}
)

@celery_app.task(bind=True, max_retries=5)
def send_verification_email(self, user_id: str, email: str, token: str, trace_id: str):
    trace_id_ctx_var.set(trace_id)
    try:
        logger.info(f"Sending verification email to {email}")
        # Mocking email dispatch
        logger.info(f"Email sent successfully to {email} with token {token}")
        return True
    except Exception as exc:
        logger.error(f"Failed to send email to {email}: {exc}")
        if self.request.retries >= self.max_retries:
            # DLQ Poison protection logic happens here - log to DLQ table or just flag
            logger.critical(f"Task permanently failed after {self.max_retries} retries. Routing to DLQ.")
            # We would write to a DLQ table here
            from app.database import SessionLocal
            from app.models import AuditLog
            import asyncio
            
            async def write_dlq():
                async with SessionLocal() as db:
                    dlq_log = AuditLog(
                        action="DLQ_EMAIL_FAILURE",
                        user_id=user_id,
                        trace_id=trace_id,
                        metadata_payload={"email": email, "token": token, "error": str(exc)}
                    )
                    db.add(dlq_log)
                    await db.commit()
            
            # Since celery workers are typically sync, we might need an event loop
            try:
                loop = asyncio.get_event_loop()
                loop.run_until_complete(write_dlq())
            except Exception as e:
                logger.error(f"Failed to write to DLQ: {e}")
                
            raise exc
        else:
            raise self.retry(exc=exc, countdown=2 ** self.request.retries)

@celery_app.task(bind=True, max_retries=3)
def write_audit_log_async(self, action: str, user_id: str, ip_address: str, user_agent: str, metadata: dict, trace_id: str):
    trace_id_ctx_var.set(trace_id)
    logger.info(f"Writing async audit log for action: {action}")
    
    from app.database import SessionLocal
    from app.models import AuditLog
    import asyncio
    
    async def write_log():
        async with SessionLocal() as db:
            log_entry = AuditLog(
                action=action,
                user_id=user_id,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata_payload=metadata,
                trace_id=trace_id
            )
            db.add(log_entry)
            await db.commit()
            
    try:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(write_log())
    except Exception as exc:
        logger.error(f"Failed to write audit log: {exc}")
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
