import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_admin_create_community_with_spatial_metadata(client: AsyncClient, admin_token: str):
    # Test creating a community with spatial data
    spatial_data = {
        "type": "Feature",
        "properties": {"area_sqm": 50000},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]
        }
    }
    
    response = await client.post(
        "/api/admin/communities",
        json={
            "name": "Spatial Community 1",
            "district": "Test District",
            "region": "Test Region",
            "capacity": 15,
            "latitude": 0.5,
            "longitude": 0.5,
            "spatial_metadata": spatial_data
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["latitude"] == 0.5
    assert data["longitude"] == 0.5
    assert data["spatial_metadata"]["type"] == "Feature"
    assert data["spatial_metadata"]["properties"]["area_sqm"] == 50000

@pytest.mark.asyncio
async def test_admin_update_community_with_spatial_metadata(client: AsyncClient, admin_token: str):
    # First create a basic community
    response = await client.post(
        "/api/admin/communities",
        json={
            "name": "Update Spatial Community 2",
            "district": "Test District",
            "region": "Test Region",
            "capacity": 15
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    comm_id = response.json()["id"]
    
    # Then update with spatial data
    spatial_data = {
        "type": "Feature",
        "properties": {"area_sqm": 75000},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[2, 2], [2, 3], [3, 3], [3, 2], [2, 2]]]
        }
    }
    
    update_resp = await client.put(
        f"/api/admin/communities/{comm_id}",
        json={
            "name": "Update Spatial Community 2",
            "district": "Test District",
            "region": "Test Region",
            "capacity": 15,
            "latitude": 2.5,
            "longitude": 2.5,
            "spatial_metadata": spatial_data
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert update_resp.status_code == 200
    data = update_resp.json()
    assert data["latitude"] == 2.5
    assert data["longitude"] == 2.5
    assert data["spatial_metadata"]["type"] == "Feature"
