from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app import models, auth, schemas
from app.database import get_db

router = APIRouter(prefix="/api/student/spatial", tags=["student_spatial"])

async def get_current_student_and_comm(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not a student")
    if not current_user.community_id:
        raise HTTPException(status_code=403, detail="Student has no assigned community")
    
    result = await db.execute(select(models.Community).filter(models.Community.id == current_user.community_id))
    community = result.scalars().first()
    if not community:
        raise HTTPException(status_code=403, detail="Community not found")
        
    return current_user, community

@router.get("/data")
async def get_spatial_data(
    db: AsyncSession = Depends(get_db),
    user_data: tuple = Depends(get_current_student_and_comm)
):
    current_user, community = user_data
    
    # Get features for this community
    feat_res = await db.execute(
        select(models.FieldFeature)
        .where(models.FieldFeature.community_id == community.id)
    )
    features = feat_res.scalars().all()
    
    # We construct the community response matching the schema
    comm_dict = {
        "id": str(community.id),
        "name": community.name,
        "district": community.district,
        "region": community.region,
        "capacity": community.capacity,
        "group_number": community.group_number,
        "group_label": f"Group {community.group_number}",
        "latitude": community.latitude,
        "longitude": community.longitude,
        "spatial_metadata": community.spatial_metadata
    }
    
    return {
        "community": comm_dict,
        "features": features
    }
