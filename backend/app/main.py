from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from contextlib import asynccontextmanager

from app.database import engine, Base
from app.routers import auth_router, admin_router, student_router, student_settings
from app.models import User
from app.auth import get_password_hash
from app.middleware import TraceMiddleware
from app.rate_limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Alembic handles table creation, so we removed Base.metadata.create_all
        
    # Create default admin if not exists (using SystemUser)
    from app.database import SessionLocal
    from sqlalchemy.future import select
    
    try:
        async with SessionLocal() as db:
            result = await db.execute(select(User).filter(User.student_id == "admin"))
            admin = result.scalars().first()
            if not admin:
                new_admin = User(
                    student_id="admin",
                    name="System Administrator",
                    email=None,
                    level=0,
                    role="admin",
                    password_hash=get_password_hash("admin"),
                    is_verified=True,
                    is_active=True
                )
                db.add(new_admin)
                await db.commit()
    except Exception as e:
        import logging
        logging.error(f"Failed to initialize default admin during startup: {e}")
            
    yield

app = FastAPI(title="CFSS API", lifespan=lifespan)

# Rate limiter setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middlewares
app.add_middleware(TraceMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*", 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Total-Count"],
)

from app.routers import auth_router, admin_router, student_router, admin_whitelist, auth_router_v2, admin_export, student_auth_router, student_surveys, student_settings, sync_router

app.include_router(auth_router.router)
app.include_router(admin_router.router)
app.include_router(student_router.router)
app.include_router(student_settings.router)
app.include_router(admin_whitelist.router)
app.include_router(auth_router_v2.router, prefix="/api/v2")
app.include_router(admin_export.router)
app.include_router(student_auth_router.router)
app.include_router(student_surveys.router)
app.include_router(sync_router.router)
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
 
