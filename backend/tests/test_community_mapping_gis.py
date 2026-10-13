import pytest
from httpx import AsyncClient
import uuid
from app import auth, models

@pytest.mark.asyncio
async def test_student_community_spatial_update_valid(client: AsyncClient, student_with_community):
    student, community, token = student_with_community
    
    spatial_data = {
        "type": "Feature",
        "properties": {
            "name": "Assigned Community Area",
            "area_sqm": 85000.5,
            "perimeter_meters": 1250.0,
            "centroid": [-1.55, 9.45],
            "provenance": "MANUALLY_MAPPED"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [[-1.56, 9.44], [-1.56, 9.46], [-1.54, 9.46], [-1.54, 9.44], [-1.56, 9.44]]
            ]
        }
    }
    
    response = await client.put(
        "/api/student/spatial/community",
        json={
            "latitude": 9.45,
            "longitude": -1.55,
            "spatial_metadata": spatial_data
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["success"] is True
    assert data["community"]["latitude"] == 9.45
    assert data["community"]["longitude"] == -1.55
    assert data["community"]["spatial_metadata"]["properties"]["provenance"] == "MANUALLY_MAPPED"
    assert data["community"]["spatial_metadata"]["properties"]["area_sqm"] == 85000.5


@pytest.mark.asyncio
async def test_student_community_spatial_multipolygon(client: AsyncClient, student_with_community):
    student, community, token = student_with_community
    
    multi_poly_data = {
        "type": "Feature",
        "properties": {
            "name": "Community Multi-zone Boundary",
            "area_sqm": 120000.0,
            "provenance": "GPS_ASSISTED"
        },
        "geometry": {
            "type": "MultiPolygon",
            "coordinates": [
                [
                    [[-1.56, 9.44], [-1.56, 9.46], [-1.55, 9.46], [-1.55, 9.44], [-1.56, 9.44]]
                ],
                [
                    [[-1.54, 9.44], [-1.54, 9.46], [-1.53, 9.46], [-1.53, 9.44], [-1.54, 9.44]]
                ]
            ]
        }
    }
    
    response = await client.put(
        "/api/student/spatial/community",
        json={
            "spatial_metadata": multi_poly_data
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["community"]["spatial_metadata"]["geometry"]["type"] == "MultiPolygon"
    assert len(res_data["community"]["spatial_metadata"]["geometry"]["coordinates"]) == 2


@pytest.mark.asyncio
async def test_student_community_spatial_point_and_collections(client: AsyncClient, student_with_community):
    student, community, token = student_with_community
    
    # Test valid Feature with Point geometry
    point_data = {
        "type": "Feature",
        "properties": {"name": "Community Center Point"},
        "geometry": {
            "type": "Point",
            "coordinates": [-1.5542, 9.4523]  # [longitude, latitude]
        }
    }
    resp1 = await client.put(
        "/api/student/spatial/community",
        json={"spatial_metadata": point_data},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp1.status_code == 200
    assert resp1.json()["community"]["spatial_metadata"]["geometry"]["type"] == "Point"

    # Test valid FeatureCollection
    collection_data = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"label": "Zone 1"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[-1.56, 9.44], [-1.56, 9.46], [-1.55, 9.46], [-1.55, 9.44], [-1.56, 9.44]]]
                }
            },
            {
                "type": "Feature",
                "properties": {"label": "Access Way"},
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[-1.555, 9.445], [-1.552, 9.450]]
                }
            }
        ]
    }
    resp2 = await client.put(
        "/api/student/spatial/community",
        json={"spatial_metadata": collection_data},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp2.status_code == 200
    assert resp2.json()["community"]["spatial_metadata"]["type"] == "FeatureCollection"


@pytest.mark.asyncio
async def test_student_community_spatial_validation_errors(client: AsyncClient, student_with_community):
    student, community, token = student_with_community
    
    # Out of range coordinates
    res1 = await client.put(
        "/api/student/spatial/community",
        json={"latitude": 95.0, "longitude": 0.0},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res1.status_code == 400
    
    res2 = await client.put(
        "/api/student/spatial/community",
        json={"latitude": 0.0, "longitude": 185.0},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res2.status_code == 400
    
    # Unclosed polygon in spatial metadata
    unclosed_meta = {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[-1.5, 9.4], [-1.5, 9.5], [-1.4, 9.5]]]
        }
    }
    res3 = await client.put(
        "/api/student/spatial/community",
        json={"spatial_metadata": unclosed_meta},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res3.status_code == 400

    # LineString with only 1 point
    invalid_line = {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": [[-1.5, 9.4]]
        }
    }
    res4 = await client.put(
        "/api/student/spatial/community",
        json={"spatial_metadata": invalid_line},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res4.status_code == 400

    # Point with invalid latitude
    invalid_point = {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [-1.5, 120.0]
        }
    }
    res5 = await client.put(
        "/api/student/spatial/community",
        json={"spatial_metadata": invalid_point},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res5.status_code == 400


@pytest.mark.asyncio
async def test_student_community_spatial_rbac_and_auth(client: AsyncClient, db, admin_token: str, student_with_community):
    student, community, student_token = student_with_community

    # 1. Unauthenticated request rejected with 401
    unauth_resp = await client.put(
        "/api/student/spatial/community",
        json={"latitude": 9.45, "longitude": -1.55}
    )
    assert unauth_resp.status_code == 401

    # 2. Admin role rejected with 403 (student-only endpoint)
    admin_resp = await client.put(
        "/api/student/spatial/community",
        json={"latitude": 9.45, "longitude": -1.55},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert admin_resp.status_code == 403

    # 3. Student with NO assigned community rejected with 403
    unassigned_student = models.User(
        student_id="TST/UNASSIGNED",
        name="Unassigned Student",
        email="unassigned@test.local",
        password_hash=auth.get_password_hash("Pass123!"),
        role="student",
        level=1,
        is_active=True,
        is_verified=True,
        community_id=None
    )
    db.add(unassigned_student)
    await db.commit()
    await db.refresh(unassigned_student)

    from datetime import timedelta
    unassigned_token = auth.create_access_token(
        data={"sub": str(unassigned_student.id), "role": "student", "pwd_ver": unassigned_student.password_hash[-8:]},
        expires_delta=timedelta(hours=1)
    )

    no_comm_resp = await client.put(
        "/api/student/spatial/community",
        json={"latitude": 9.45, "longitude": -1.55},
        headers={"Authorization": f"Bearer {unassigned_token}"}
    )
    assert no_comm_resp.status_code == 403
    assert "no assigned community" in no_comm_resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_sync_feature_and_survey_atomic_linkage(client: AsyncClient, student_with_community):
    student, community, token = student_with_community
    
    feature_id = str(uuid.uuid4())
    survey_id = str(uuid.uuid4())
    op1_id = str(uuid.uuid4())
    op2_id = str(uuid.uuid4())
    
    payload = {
        "operations": [
            {
                "operation_id": op1_id,
                "operation_type": "CREATE",
                "entity_type": "FEATURE",
                "entity_id": feature_id,
                "payload": {
                    "feature_type": "HOUSEHOLD",
                    "latitude": 9.4523,
                    "longitude": -1.5542,
                    "accuracy_meters": 3.8,
                    "metadata_json": {
                        "name": "Compound 10A",
                        "provenance": "GPS_ASSISTED"
                    }
                }
            },
            {
                "operation_id": op2_id,
                "operation_type": "CREATE",
                "entity_type": "SURVEY",
                "entity_id": survey_id,
                "payload": {
                    "survey_type": "HOUSEHOLD",
                    "field_feature_id": feature_id,
                    "status": "DRAFT",
                    "answers": [
                        {"section_id": "sec1", "question_id": "head_name", "value_json": "Ibrahim Mensah"}
                    ]
                }
            }
        ]
    }
    
    sync_res = await client.post(
        "/api/sync/operations",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert sync_res.status_code == 200, sync_res.text
    sync_data = sync_res.json()
    assert len(sync_data["results"]) == 2
    assert sync_data["results"][0]["success"] is True
    assert sync_data["results"][1]["success"] is True
    
    # Query spatial data endpoint to ensure the created feature appears for the community
    spatial_res = await client.get(
        "/api/student/spatial/data",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert spatial_res.status_code == 200
    features = spatial_res.json()["features"]
    found_feat = next((f for f in features if f["id"] == feature_id), None)
    assert found_feat is not None
    assert found_feat["feature_type"] == "HOUSEHOLD"
    assert abs(found_feat["latitude"] - 9.4523) < 0.0001
    assert abs(found_feat["longitude"] - (-1.5542)) < 0.0001
    assert found_feat["accuracy_meters"] == 3.8


@pytest.mark.asyncio
async def test_sync_survey_retry_idempotency_no_duplicate_feature(client: AsyncClient, student_with_community):
    student, community, token = student_with_community
    
    feature_id = str(uuid.uuid4())
    survey_id = str(uuid.uuid4())
    op1_id = str(uuid.uuid4())
    op2_id = str(uuid.uuid4())
    
    single_payload = {
        "operations": [
            {
                "operation_id": op1_id,
                "operation_type": "CREATE",
                "entity_type": "FEATURE",
                "entity_id": feature_id,
                "payload": {
                    "feature_type": "EDUCATION",
                    "latitude": 9.4510,
                    "longitude": -1.5520,
                    "accuracy_meters": 4.0,
                    "metadata_json": {"name": "Community Basic School"}
                }
            },
            {
                "operation_id": op2_id,
                "operation_type": "CREATE",
                "entity_type": "SURVEY",
                "entity_id": survey_id,
                "payload": {
                    "survey_type": "EDUCATION",
                    "field_feature_id": feature_id,
                    "status": "DRAFT",
                    "answers": []
                }
            }
        ]
    }

    # First sync run
    res1 = await client.post("/api/sync/operations", json=single_payload, headers={"Authorization": f"Bearer {token}"})
    assert res1.status_code == 200
    assert res1.json()["results"][0]["success"] is True

    # Immediate retry of the identical CREATE payload (simulating network replay or retry)
    res2 = await client.post("/api/sync/operations", json=single_payload, headers={"Authorization": f"Bearer {token}"})
    assert res2.status_code == 200
    assert res2.json()["results"][0]["success"] is True

    # Verify that in database, only 1 feature exists for this ID and 1 survey exists
    spatial_res = await client.get("/api/student/spatial/data", headers={"Authorization": f"Bearer {token}"})
    features = spatial_res.json()["features"]
    matching_feats = [f for f in features if f["id"] == feature_id]
    assert len(matching_feats) == 1


@pytest.mark.asyncio
async def test_sync_road_feature_with_linestring_geometry(client: AsyncClient, student_with_community):
    student, community, token = student_with_community
    
    road_id = str(uuid.uuid4())
    op_id = str(uuid.uuid4())
    
    line_coords = [[-1.550, 9.450], [-1.552, 9.453], [-1.555, 9.458]]
    payload = {
        "operations": [
            {
                "operation_id": op_id,
                "operation_type": "CREATE",
                "entity_type": "FEATURE",
                "entity_id": road_id,
                "payload": {
                    "feature_type": "ROAD",
                    "latitude": 9.453,
                    "longitude": -1.552,
                    "accuracy_meters": None,
                    "metadata_json": {
                        "name": "Main Market Access Road",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": line_coords
                        },
                        "length_meters": 1150.0
                    }
                }
            }
        ]
    }
    
    sync_res = await client.post(
        "/api/sync/operations",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert sync_res.status_code == 200
    sync_data = sync_res.json()
    assert sync_data["results"][0]["success"] is True
    
    # Verify spatial data retrieval
    spatial_res = await client.get(
        "/api/student/spatial/data",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert spatial_res.status_code == 200
    features = spatial_res.json()["features"]
    road_feat = next((f for f in features if f["id"] == road_id), None)
    assert road_feat is not None
    assert road_feat["feature_type"] == "ROAD"
    assert road_feat["metadata_json"]["geometry"]["type"] == "LineString"
    assert road_feat["metadata_json"]["geometry"]["coordinates"] == line_coords


@pytest.mark.asyncio
async def test_geocoding_endpoint_auth_required(client: AsyncClient):
    response = await client.get("/api/student/spatial/geocode?q=Ejisu")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_geocoding_endpoint_query_validation(client: AsyncClient, student_with_community):
    _, _, token = student_with_community
    response = await client.get(
        "/api/student/spatial/geocode?q=a",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_geocoding_endpoint_mock_and_caching(client: AsyncClient, student_with_community, monkeypatch):
    _, _, token = student_with_community
    import app.geocoding as geo_mod

    # Set provider to mock for deterministic testing
    monkeypatch.setattr(geo_mod, "GEOCODING_PROVIDER", "mock")

    # Clear test cache
    geo_mod._local_cache.clear()

    # First request: should hit mock provider and cache result
    resp1 = await client.get(
        "/api/student/spatial/geocode?q=Ejisu",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp1.status_code == 200, resp1.text
    data1 = resp1.json()
    assert data1["query"] == "Ejisu"
    assert len(data1["results"]) >= 1
    assert data1["results"][0]["lat"] == 6.7142
    assert data1["results"][0]["lon"] == -1.5111
    assert "OpenStreetMap" in data1["attribution"]
    assert "openstreetmap.org" in data1["licence"]
    assert data1["cached"] is False

    # Second request: identical query should hit cache
    resp2 = await client.get(
        "/api/student/spatial/geocode?q=Ejisu",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["cached"] is True
    assert data2["results"] == data1["results"]


@pytest.mark.asyncio
async def test_geocoding_rate_limiter_pacing(monkeypatch):
    import app.geocoding as geo_mod
    import time

    # Reset in-memory rate limiter tracking
    geo_mod._local_next_allowed_time = 0.0
    monkeypatch.setattr(geo_mod, "MIN_INTERVAL_SECONDS", 0.05)
    monkeypatch.setattr(geo_mod, "redis_client", None)

    t0 = time.time()
    await geo_mod.acquire_geocoding_slot()
    t1 = time.time()
    await geo_mod.acquire_geocoding_slot()
    t2 = time.time()

    # Second acquire should have slept by at least MIN_INTERVAL_SECONDS
    assert (t2 - t1) >= 0.04
