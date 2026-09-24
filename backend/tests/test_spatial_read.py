import pytest
from httpx import AsyncClient
from app import models
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

@pytest.mark.asyncio
async def test_get_student_spatial_data(client: AsyncClient, student_with_community, db: AsyncSession):
    student, community, token = student_with_community
    await db.refresh(community)
    await db.refresh(student)
    comm_id = community.id
    stud_id = student.id

    # Insert a dummy feature for the community
    feature = models.FieldFeature(
        id="feature-test-1",
        community_id=comm_id,
        captured_by_id=stud_id,
        feature_type="HOUSEHOLD",
        latitude=5.56,
        longitude=-0.21,
        accuracy_meters=2.5,
        metadata_json={"test": "data"}
    )
    db.add(feature)
    
    # Update community spatial data
    comm_id = str(community.id)
    community.latitude = 5.55
    community.longitude = -0.20
    community.spatial_metadata = {"boundary": {"type": "Polygon", "coordinates": [[[1,2],[2,3],[3,4]]]}}
    await db.commit()
    

    # Call endpoint
    res = await client.get("/api/student/spatial/data", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()

    assert "community" in data
    assert "features" in data
    
    assert data["community"]["latitude"] == 5.55
    assert data["community"]["latitude"] == 5.55
    assert data["community"]["longitude"] == -0.20
    assert data["community"]["spatial_metadata"]["boundary"]["type"] == "Polygon"

    assert len(data["features"]) == 1
    assert data["features"][0]["id"] == "feature-test-1"
    assert data["features"][0]["feature_type"] == "HOUSEHOLD"
    assert data["features"][0]["latitude"] == 5.56
