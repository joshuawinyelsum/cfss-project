from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from typing import List

from app import schemas, models, auth
from app.database import get_db

router = APIRouter(prefix="/api/admin", tags=["admin"])

async def get_db_and_admin(db: AsyncSession = Depends(get_db), admin: models.User = Depends(auth.get_current_admin)):
    return db

@router.post("/communities", response_model=schemas.CommunityResponse)
async def create_community(comm: schemas.CommunityCreate, db: AsyncSession = Depends(get_db_and_admin)):
    # Check if exists
    result = await db.execute(select(models.Community).filter(models.Community.name == comm.name))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Community already exists")
        
    if comm.capacity <= 0:
        raise HTTPException(status_code=400, detail="Capacity must be greater than 0")
        
    group_created = False
    for attempt in range(3):
        try:
            max_group_result = await db.execute(select(func.max(models.Community.group_number)))
            max_group = max_group_result.scalar() or 0
            next_group = max_group + 1
            
            new_community = models.Community(
                name=comm.name,
                district=comm.district,
                region=comm.region,
                capacity=comm.capacity,
                current_count=0,
                group_number=next_group
            )
            db.add(new_community)
            await db.flush()
            
            response_data = {
                "id": str(new_community.id),
                "name": new_community.name,
                "district": new_community.district,
                "region": new_community.region,
                "capacity": new_community.capacity,
                "student_count": new_community.current_count,
                "slots_remaining": new_community.capacity - new_community.current_count,
                "group_number": new_community.group_number,
                "group_label": f"Group {new_community.group_number}"
            }
            
            group_created = True
            break
        except IntegrityError:
            await db.rollback()
            continue
            
    if not group_created:
        raise HTTPException(status_code=500, detail="Failed to create community due to high concurrency")
        
    await db.commit()
    
    return response_data

@router.delete("/communities/{community_id}")
async def delete_community(community_id: str, db: AsyncSession = Depends(get_db_and_admin)):
    try:
        community_id_int = int(community_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid community ID")
        
    result = await db.execute(select(models.Community).filter(models.Community.id == community_id_int))
    community = result.scalars().first()
    
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
        
    if community.current_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete community with assigned students")
        
    await db.delete(community)
    await db.commit()
    return {"message": "Community deleted successfully"}

@router.get("/communities", response_model=List[schemas.CommunityResponse])
async def get_communities(db: AsyncSession = Depends(get_db_and_admin)):
    communities_result = await db.execute(select(models.Community).order_by(models.Community.id))
    communities = communities_result.scalars().all()
    
    response = []
    for comm in communities:
        response.append({
            "id": str(comm.id),
            "name": comm.name,
            "district": comm.district,
            "region": comm.region,
            "capacity": comm.capacity,
            "student_count": comm.current_count,
            "slots_remaining": comm.capacity - comm.current_count,
            "group_number": comm.group_number,
            "group_label": f"Group {comm.group_number}"
        })
    return response

@router.put("/communities/{community_id}", response_model=schemas.CommunityResponse)
async def update_community(community_id: str, comm_update: schemas.CommunityCreate, db: AsyncSession = Depends(get_db_and_admin)):
    result = await db.execute(select(models.Community).filter(models.Community.id == community_id))
    community = result.scalars().first()
    
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
        
    if comm_update.capacity < community.current_count:
        raise HTTPException(status_code=409, detail=f"Cannot reduce capacity below current student count ({community.current_count})")
        
    community.name = comm_update.name
    community.district = comm_update.district
    community.region = comm_update.region
    community.capacity = comm_update.capacity
    
    await db.commit()
    
    return {
        "id": str(community.id),
        "name": community.name,
        "district": community.district,
        "region": community.region,
        "capacity": community.capacity,
        "student_count": community.current_count,
        "slots_remaining": community.capacity - community.current_count,
        "group_number": community.group_number,
        "group_label": f"Group {community.group_number}"
    }

@router.delete("/communities/{community_id}")
async def delete_community(community_id: str, db: AsyncSession = Depends(get_db_and_admin)):
    result = await db.execute(select(models.Community).filter(models.Community.id == community_id))
    community = result.scalars().first()
    
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
        
    if community.current_count > 0:
        raise HTTPException(status_code=409, detail="Cannot delete community with assigned students")
        
    await db.delete(community)
    await db.commit()
    return {"message": "Community deleted successfully"}

@router.post("/logout")
async def admin_logout(current_user: models.User = Depends(auth.get_current_admin)):
    # With stateless JWTs, logout is mostly handled client-side.
    # If sessions or token blacklisting were used, we would invalidate the token here.
    return {"message": "Logged out successfully"}

@router.put("/settings", response_model=schemas.SettingsResponse)
async def update_settings(settings_update: schemas.SettingsUpdate, db: AsyncSession = Depends(get_db_and_admin)):
    # Validate Admin Password for Sensitive Action
    if settings_update.admin_password != "admin123":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Incorrect admin password. Cannot save settings."
        )

    result = await db.execute(select(models.SystemSettings).limit(1))
    settings = result.scalars().first()
    
    if not settings:
        settings = models.SystemSettings()
        db.add(settings)
        
    settings.registration_open = settings_update.registration_open
    settings.max_students_per_community = settings_update.max_students_per_community
    settings.auto_assign_enabled = settings_update.auto_assign_enabled
    settings.assignment_strategy = settings_update.assignment_strategy
    settings.survey_enabled = settings_update.survey_enabled
    settings.survey_deadline = settings_update.survey_deadline
    settings.allow_multiple_submissions = settings_update.allow_multiple_submissions
    settings.default_page_size = settings_update.default_page_size
    
    if settings_update.registration_password:
        settings.registration_password_hash = auth.get_password_hash(settings_update.registration_password)
        
    await db.commit()
    await db.refresh(settings)
    return settings

@router.put("/settings/registration", response_model=schemas.SettingsResponse)
async def update_registration_setting(request: schemas.RegistrationToggleRequest, db: AsyncSession = Depends(get_db_and_admin)):
    # Validate Admin Password for Sensitive Action
    if request.admin_password != "admin123":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Incorrect admin password. Cannot save settings."
        )

    result = await db.execute(select(models.SystemSettings).limit(1))
    settings = result.scalars().first()
    
    if not settings:
        settings = models.SystemSettings()
        db.add(settings)
        
    settings.registration_open = request.registration_enabled
    
    await db.commit()
    await db.refresh(settings)
    return settings

@router.get("/settings", response_model=schemas.SettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db_and_admin)):
    result = await db.execute(select(models.SystemSettings).limit(1))
    settings = result.scalars().first()
    
    if not settings:
        settings = models.SystemSettings()
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
        
    return settings

@router.get("/surveys/stats", response_model=schemas.AdminSurveyStatsResponse)
async def get_survey_stats(db: AsyncSession = Depends(get_db_and_admin)):
    # Total surveys
    total_result = await db.execute(select(func.count(models.Survey.id)))
    total_surveys = total_result.scalar() or 0
    
    # By community
    by_comm_query = (
        select(models.Community.name, func.count(models.Survey.id))
        .join(models.Survey, models.Community.id == models.Survey.community_id)
        .group_by(models.Community.name)
        .order_by(models.Community.name)
    )
    by_comm_result = await db.execute(by_comm_query)
    by_community = [
        {"community_name": name, "count": count}
        for name, count in by_comm_result.all()
    ]
    
    return {
        "total_surveys": total_surveys,
        "by_community": by_community
    }

@router.get("/surveys", response_model=List[schemas.AdminSurveyListResponse])
async def get_all_surveys(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db_and_admin)):
    query = (
        select(models.Survey, models.User, models.Community)
        .join(models.User, models.Survey.user_id == models.User.id)
        .join(models.Community, models.User.community_id == models.Community.id)
        .order_by(models.Survey.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    
    response = []
    for survey, user, comm in result.all():
        response.append({
            "id": str(survey.id),
            "student_email": user.email or "",
            "community_name": comm.name,
            "group_number": comm.group_number,
            "submitted_at": survey.created_at,
            "status": survey.status,
            "type": survey.type
        })
    return response

@router.get("/surveys/{survey_id}", response_model=schemas.AdminSurveyDetailResponse)
async def get_survey(survey_id: str, db: AsyncSession = Depends(get_db_and_admin)):
    try:
        survey_id_int = int(survey_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid survey ID format")
        
    query = (
        select(models.Survey, models.User, models.Community)
        .join(models.User, models.Survey.user_id == models.User.id)
        .join(models.Community, models.User.community_id == models.Community.id)
        .filter(models.Survey.id == survey_id_int)
    )
    result = await db.execute(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Survey not found")
        
    survey, user, comm = row
    return {
        "id": str(survey.id),
        "student_email": user.email or "",
        "community_name": comm.name,
        "group_number": comm.group_number,
        "submitted_at": survey.created_at,
        "status": survey.status,
        "type": survey.type,
        "responses": survey.data
    }

@router.get("/students", response_model=List[schemas.UserResponse])
async def get_all_students(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db_and_admin)):
    query = (
        select(models.User, models.Community)
        .join(models.Community, models.User.community_id == models.Community.id)
        .filter(models.User.role == "student")
        .order_by(models.Community.name, models.Community.group_number, models.User.email)
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    
    response = []
    for user, comm in result.all():
        response.append({
            "id": str(user.id),
            "student_id": user.student_id,
            "name": user.name,
            "email": user.email or "",
            "program": user.program,
            "level": user.level,
            "role": user.role,
            "community_id": str(user.community_id),
            "community_name": comm.name,
            "group_label": comm.group_label if hasattr(comm, "group_label") else f"Group {comm.group_number}",
            "group_number": comm.group_number,
            "district": comm.district,
            "region": comm.region
        })
    return response

@router.get("/students/{student_id}", response_model=schemas.UserResponse)
async def get_student(student_id: str, db: AsyncSession = Depends(get_db_and_admin)):
    try:
        user_id_int = int(student_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid student ID format")
        
    query = (
        select(models.User, models.Community)
        .join(models.Community, models.User.community_id == models.Community.id)
        .filter(models.User.id == user_id_int, models.User.role == "student")
    )
    result = await db.execute(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Student not found or not in a community")
        
    user, comm = row
    return {
        "id": str(user.id),
        "student_id": user.student_id,
        "name": user.name,
        "email": user.email or "",
        "program": user.program,
        "level": user.level,
        "role": user.role,
        "community_id": str(user.community_id),
        "community_name": comm.name,
        "group_label": comm.group_label if hasattr(comm, "group_label") else f"Group {comm.group_number}",
        "group_number": comm.group_number,
        "district": comm.district,
        "region": comm.region
    }

@router.get("/sync/overview")
async def get_sync_overview(db: AsyncSession = Depends(get_db_and_admin)):
    # Calculate global sync stats for admin dashboard
    stats_query = await db.execute(
        select(
            func.count(models.SurveyRecord.id).label("total"),
            func.count().filter(models.SurveyRecord.sync_status == 'synced').label("synced"),
            func.count().filter(models.SurveyRecord.sync_status == 'pending').label("pending"),
            func.count().filter(models.SurveyRecord.sync_status == 'failed').label("failed")
        )
    )
    stats = stats_query.first()
    
    return {
        "total": stats.total or 0,
        "synced": stats.synced or 0,
        "pending": stats.pending or 0,
        "failed": stats.failed or 0
    }

@router.get("/notifications")
async def get_admin_notifications(limit: int = 50, db: AsyncSession = Depends(get_db_and_admin)):
    # Get recent admin notifications
    result = await db.execute(
        select(models.AdminNotification)
        .order_by(models.AdminNotification.created_at.desc())
        .limit(limit)
    )
    
    notifications = []
    for notif in result.scalars().all():
        notifications.append({
            "id": notif.id,
            "type": notif.type,
            "title": notif.title,
            "message": notif.message,
            "is_read": notif.is_read,
            "created_at": notif.created_at.isoformat() if notif.created_at else None
        })
        
    return notifications
