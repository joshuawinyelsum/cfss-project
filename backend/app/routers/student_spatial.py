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

class StudentCommunitySpatialUpdate(schemas.BaseModel):
    latitude: schemas.Optional[float] = None
    longitude: schemas.Optional[float] = None
    spatial_metadata: schemas.Optional[schemas.Dict[str, schemas.Any]] = None

@router.put("/community")
async def update_student_community_spatial(
    payload: StudentCommunitySpatialUpdate,
    db: AsyncSession = Depends(get_db),
    user_data: tuple = Depends(get_current_student_and_comm)
):
    current_user, community = user_data
    if payload.spatial_metadata is not None:
        try:
            schemas.CommunityCreate.validate_spatial_metadata(payload.spatial_metadata)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        community.spatial_metadata = payload.spatial_metadata
    if payload.latitude is not None:
        if payload.latitude < -90 or payload.latitude > 90:
            raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90")
        community.latitude = payload.latitude
    if payload.longitude is not None:
        if payload.longitude < -180 or payload.longitude > 180:
            raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")
        community.longitude = payload.longitude

    await db.commit()
    await db.refresh(community)
    return {
        "success": True,
        "community": {
            "id": str(community.id),
            "name": community.name,
            "latitude": community.latitude,
            "longitude": community.longitude,
            "spatial_metadata": community.spatial_metadata
        }
    }


from app.geocoding import (
    geocode_settlement,
    get_provider_name,
    ATTRIBUTION,
    LICENCE
)

@router.get("/geocode", response_model=schemas.GeocodingResponse)
async def geocode_community_location(
    q: str,
    country: schemas.Optional[str] = "gh",
    limit: schemas.Optional[int] = 5,
    current_user: models.User = Depends(auth.get_current_user)
):
    trimmed = q.strip()
    if not trimmed or len(trimmed) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query string must be at least 2 characters long."
        )

    results, cached = await geocode_settlement(trimmed, country=country or "gh", limit=limit or 5)
    return {
        "query": trimmed,
        "results": results,
        "attribution": ATTRIBUTION,
        "licence": LICENCE,
        "provider": get_provider_name(),
        "cached": cached
    }
