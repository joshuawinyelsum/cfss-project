from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from contextlib import asynccontextmanager

from app.database import engine, Base
from app.routers.recovery_router import router as recovery_router
from app.routers import student_spatial, auth_router, admin_router, student_router, student_settings
from app.models import User
from app.auth import get_password_hash
from app.middleware import TraceMiddleware
from app.rate_limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.settings import CORS_ORIGINS

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.database import SessionLocal
    from sqlalchemy.future import select
    from app.auth import get_password_hash
    import os
    import logging
    
    try:
        async with SessionLocal() as db:
            result = await db.execute(select(User).filter(User.student_id == "ADMIN"))
            admin = result.scalars().first()
            
            # Secure: Only create if missing, or update if operator explicitly provides ADMIN_BOOTSTRAP_PASSWORD
            bootstrap_pwd = os.getenv("ADMIN_BOOTSTRAP_PASSWORD")
            if not admin:
                initial_pwd = bootstrap_pwd or os.getenv("ADMIN_INITIAL_PASSWORD", "CfssAdmin2026!SecureKey")
                new_admin = User(
                    student_id="ADMIN",
                    name="System Administrator",
                    email="admin@cfss.local",
                    level=0,
                    role="admin",
                    password_hash=get_password_hash(initial_pwd),
                    is_verified=True,
                    is_active=True
                )
                db.add(new_admin)
                await db.commit()
            elif bootstrap_pwd:
                admin.password_hash = get_password_hash(bootstrap_pwd)
                await db.commit()

            if admin and not admin.email:
                admin.email = os.getenv("ADMIN_EMAIL", "admin@cfss.local")
                await db.commit()
            # Ensure active_whitelist_entries view exists
            from sqlalchemy import text
            await db.execute(text("""
                CREATE OR REPLACE VIEW active_whitelist_entries AS
                SELECT we.*
                FROM whitelist_entries we
                JOIN whitelists w ON we.whitelist_id = w.id
                WHERE w.status = 'ACTIVE';
            """))
            await db.commit()
    except Exception as e:
        import logging
        logging.error(f"Failed to initialize default admin or active_whitelist_entries view during startup: {e}")
        if os.getenv("ENVIRONMENT") == "production" or os.getenv("STRICT_STARTUP") == "true":
            raise RuntimeError(f"Startup aborted due to database initialization failure: {e}") from e
            
    yield




app = FastAPI(title="CFSS API", lifespan=lifespan)

# Health & Readiness checks
@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok"}

@app.get("/ready", tags=["system"])
async def readiness_check():
    from app.database import SessionLocal
    from sqlalchemy import text
    from fastapi import HTTPException
    try:
        async with SessionLocal() as db:
            await db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unreachable: {str(e)}")

# Rate limiter setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middlewares
app.add_middleware(TraceMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS, 
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Total-Count"],
)

from app.routers.recovery_router import router as recovery_router
from app.routers import student_spatial, auth_router, admin_router, student_router, admin_whitelist, auth_router_v2, admin_export, student_auth_router, student_surveys, student_settings, sync_router

app.include_router(auth_router.router)
app.include_router(admin_router.router)
app.include_router(student_router.router)
app.include_router(student_settings.router)
app.include_router(admin_whitelist.router)
app.include_router(admin_whitelist.router, prefix="/api")
app.include_router(auth_router_v2.router, prefix="/api/v2")
app.include_router(admin_export.router)
app.include_router(admin_export.router, prefix="/api")
app.include_router(student_auth_router.router)
app.include_router(student_surveys.router)
app.include_router(sync_router.router)
app.include_router(student_spatial.router)
app.include_router(recovery_router)
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
 
