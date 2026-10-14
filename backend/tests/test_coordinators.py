"""
test_coordinators.py - Tests for Admin Coordinator Management and Scoped Coordinator System.
"""
import pytest
import pytest_asyncio
from datetime import timedelta
from app import auth, models


@pytest_asyncio.fixture
async def coordinator_user(db):
    """Create a coordinator user and return (coordinator, token)."""
    coord = models.User(
        student_id="COORD001",
        name="Dr. John Coordinator",
        email="coord1@test.local",
        phone_number="+233200000001",
        faculty="Public Health",
        password_hash=auth.get_password_hash("CoordPass123!"),
        role="coordinator",
        level=0,
        is_active=True,
        is_verified=True,
    )
    db.add(coord)
    await db.commit()
    await db.refresh(coord)

    token = auth.create_access_token(
        data={"sub": str(coord.id), "role": "coordinator", "pwd_ver": coord.password_hash[-8:]},
        expires_delta=timedelta(hours=1),
    )
    return coord, token


@pytest_asyncio.fixture
async def sample_setup(db, coordinator_user):
    """
    Sets up:
    - Community A (Group 1) assigned to coordinator_user
    - Community B (Group 2) NOT assigned to coordinator_user
    - Student A in Community A
    - Student B in Community B
    - Survey A by Student A
    - Survey B by Student B
    """
    coord, coord_token = coordinator_user

    comm_a = models.Community(
        name="Village Alpha",
        district="Central District",
        region="Ashanti",
        capacity=10,
        current_count=1,
        group_number=1,
    )
    comm_b = models.Community(
        name="Village Beta",
        district="Eastern District",
        region="Eastern",
        capacity=10,
        current_count=1,
        group_number=2,
    )
    db.add_all([comm_a, comm_b])
    await db.flush()

    # Assign Community A to coordinator
    assignment = models.CoordinatorAssignment(
        coordinator_id=coord.id,
        community_id=comm_a.id,
        is_active=True,
    )
    db.add(assignment)

    student_a = models.User(
        student_id="STU/2026/001",
        name="Alice Student",
        email="alice@test.local",
        password_hash=auth.get_password_hash("Alice123!"),
        role="student",
        level=1,
        is_active=True,
        community_id=comm_a.id,
    )
    student_b = models.User(
        student_id="STU/2026/002",
        name="Bob Student",
        email="bob@test.local",
        password_hash=auth.get_password_hash("Bob123!"),
        role="student",
        level=1,
        is_active=True,
        community_id=comm_b.id,
    )
    db.add_all([student_a, student_b])
    await db.flush()

    survey_a = models.SurveyRecord(
        community_id=comm_a.id,
        created_by_student_id=student_a.id,
        survey_type="HEALTH",
        entity_id="HEA-001",
        status="SUBMITTED",
        review_status="PENDING",
    )
    survey_b = models.SurveyRecord(
        community_id=comm_b.id,
        created_by_student_id=student_b.id,
        survey_type="HEALTH",
        entity_id="HEA-002",
        status="SUBMITTED",
        review_status="PENDING",
    )
    db.add_all([survey_a, survey_b])
    await db.commit()
    await db.refresh(comm_a)
    await db.refresh(comm_b)
    await db.refresh(student_a)
    await db.refresh(student_b)
    await db.refresh(survey_a)
    await db.refresh(survey_b)

    return {
        "coord": coord,
        "coord_token": coord_token,
        "comm_a": comm_a,
        "comm_b": comm_b,
        "student_a": student_a,
        "student_b": student_b,
        "survey_a": survey_a,
        "survey_b": survey_b,
    }


# ============================================================================
# Admin Coordinator Management Tests
# ============================================================================

@pytest.mark.asyncio
async def test_admin_create_coordinator(client, admin_token):
    payload = {
        "staff_id": "COORD099",
        "name": "Prof. Margaret Smith",
        "email": "msmith@university.edu",
        "phone_number": "+233244112233",
        "faculty": "School of Medicine",
        "password": "Password123!",
    }
    response = await client.post(
        "/api/admin/coordinators",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["staff_id"] == "COORD099"
    assert data["role"] == "coordinator"
    assert data["is_active"] is True
    assert "id" in data


@pytest.mark.asyncio
async def test_admin_create_coordinator_duplicate_staff_id(client, admin_token, coordinator_user):
    coord, _ = coordinator_user
    payload = {
        "staff_id": coord.student_id,  # duplicate
        "name": "Duplicate Person",
        "email": "different@test.local",
        "password": "Password123!",
    }
    response = await client.post(
        "/api/admin/coordinators",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 409
    assert "already registered" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_admin_list_and_update_coordinator(client, admin_token, coordinator_user):
    coord, _ = coordinator_user
    # List
    response = await client.get(
        "/api/admin/coordinators",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    items = response.json()
    assert any(c["id"] == coord.id for c in items)

    # Update
    update_payload = {
        "name": "Dr. John Coordinator Updated",
        "phone_number": "+233501234567",
        "faculty": "Global Health",
    }
    update_res = await client.put(
        f"/api/admin/coordinators/{coord.id}",
        json=update_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Dr. John Coordinator Updated"
    assert update_res.json()["faculty"] == "Global Health"

    # Status toggle
    status_res = await client.patch(
        f"/api/admin/coordinators/{coord.id}/status",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert status_res.status_code == 200
    assert status_res.json()["is_active"] is False


@pytest.mark.asyncio
async def test_admin_assign_coordinator_communities_and_groups(client, admin_token, coordinator_user, db):
    coord, _ = coordinator_user
    comm = models.Community(
        name="Sub-District Delta",
        district="Delta Dist",
        region="Volta",
        capacity=15,
        current_count=0,
        group_number=5,
    )
    db.add(comm)
    await db.commit()
    await db.refresh(comm)

    # Assign community - returns full CoordinatorResponse
    assign_res = await client.post(
        f"/api/admin/coordinators/{coord.id}/assign",
        json={"community_ids": [comm.id], "notes": "Primary assignment"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert assign_res.status_code == 200
    assign_data = assign_res.json()
    # CoordinatorResponse: {"id": ..., "assignments": [...], ...}
    assert assign_data["id"] == coord.id
    assert len(assign_data["assignments"]) == 1
    assert assign_data["assignments"][0]["community_id"] == comm.id

    # Assign by group number - also returns CoordinatorResponse
    group_res = await client.post(
        f"/api/admin/coordinators/{coord.id}/assign-groups",
        json={"group_numbers": [5]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert group_res.status_code == 200
    assert len(group_res.json()["assignments"]) >= 1

    # Remove assignment
    del_res = await client.delete(
        f"/api/admin/coordinators/{coord.id}/assignments/{comm.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_res.status_code == 200

    # Assignment matrix
    matrix_res = await client.get(
        "/api/admin/coordinators/assignments/matrix",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert matrix_res.status_code == 200


# ============================================================================
# Coordinator Scoped Access & Workflows Tests
# ============================================================================

@pytest.mark.asyncio
async def test_coordinator_overview_scoped(client, sample_setup):
    token = sample_setup["coord_token"]
    response = await client.get(
        "/api/coordinator/overview",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    # Schema: assigned_communities_count, assigned_fieldworkers_count, recent_activity
    assert data["assigned_communities_count"] == 1
    assert data["assigned_fieldworkers_count"] == 1
    assert data["surveys_total"] == 1
    assert len(data["recent_activity"]) == 1
    assert data["recent_activity"][0]["community_name"] == sample_setup["comm_a"].name


@pytest.mark.asyncio
async def test_coordinator_community_scoping(client, sample_setup):
    token = sample_setup["coord_token"]
    comm_a = sample_setup["comm_a"]
    comm_b = sample_setup["comm_b"]

    # List communities (should only include assigned Village Alpha)
    res = await client.get(
        "/api/coordinator/communities",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    communities = res.json()
    assert len(communities) == 1
    assert communities[0]["id"] == comm_a.id

    # Detailed access to assigned community - returns {"community": {...}, "roster": [...]}
    detail_res = await client.get(
        f"/api/coordinator/communities/{comm_a.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["community"]["name"] == comm_a.name
    assert len(detail["roster"]) == 1

    # Attempt to access unassigned community -> 403 Forbidden
    forbidden_res = await client.get(
        f"/api/coordinator/communities/{comm_b.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert forbidden_res.status_code == 403


@pytest.mark.asyncio
async def test_coordinator_fieldworkers_scoping(client, sample_setup):
    token = sample_setup["coord_token"]
    student_a = sample_setup["student_a"]
    student_b = sample_setup["student_b"]

    # List fieldworkers -> only Alice
    res = await client.get(
        "/api/coordinator/fieldworkers",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    fieldworkers = res.json()
    assert len(fieldworkers) == 1
    assert fieldworkers[0]["id"] == student_a.id

    # Detailed access to Alice - returns {"student": {...}, "surveys": [...], "issues": [...]}
    detail_res = await client.get(
        f"/api/coordinator/fieldworkers/{student_a.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert detail_res.status_code == 200
    assert detail_res.json()["student"]["name"] == "Alice Student"

    # Attempt to access Bob (unassigned community) -> 403 Forbidden
    forbidden_res = await client.get(
        f"/api/coordinator/fieldworkers/{student_b.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert forbidden_res.status_code == 403


@pytest.mark.asyncio
async def test_coordinator_survey_review(client, sample_setup):
    token = sample_setup["coord_token"]
    survey_a = sample_setup["survey_a"]
    survey_b = sample_setup["survey_b"]

    # Review assigned survey -> Flag with notes
    review_res = await client.post(
        f"/api/coordinator/surveys/{survey_a.id}/review",
        json={"review_status": "FLAGGED", "review_notes": "Coordinates seem outside community polygon"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert review_res.status_code == 200
    updated = review_res.json()
    assert updated["review_status"] == "FLAGGED"
    assert "Coordinates" in updated["review_notes"]

    # Attempt to review unassigned survey -> 403 Forbidden
    forbidden_res = await client.post(
        f"/api/coordinator/surveys/{survey_b.id}/review",
        json={"review_status": "VERIFIED", "review_notes": "Looks good"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert forbidden_res.status_code == 403


@pytest.mark.asyncio
async def test_coordinator_issue_lifecycle(client, sample_setup):
    token = sample_setup["coord_token"]
    comm_a = sample_setup["comm_a"]
    student_a = sample_setup["student_a"]
    survey_a = sample_setup["survey_a"]

    # 1. Create Issue
    issue_payload = {
        "community_id": comm_a.id,
        "student_id": student_a.id,
        "survey_id": str(survey_a.id),
        "title": "Suspected duplicate survey response",
        "issue_type": "DATA_ANOMALY",
        "severity": "MEDIUM",
        "reason": "Timestamp coincides with another student submission",
        "action_requested": "Provide clarification or re-survey household",
    }
    create_res = await client.post(
        "/api/coordinator/issues",
        json=issue_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_res.status_code == 201
    issue = create_res.json()
    issue_id = issue["id"]
    assert issue["status"] == "OPEN"

    # 2. Update Issue with Student Explanation
    update_res = await client.patch(
        f"/api/coordinator/issues/{issue_id}",
        json={
            "fieldworker_explanation": "Interview was conducted jointly with peer but recorded separately.",
            "status": "UNDER_INVESTIGATION",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "UNDER_INVESTIGATION"
    assert "jointly" in update_res.json()["fieldworker_explanation"]

    # 3. Resolve Issue
    resolve_res = await client.patch(
        f"/api/coordinator/issues/{issue_id}",
        json={
            "status": "RESOLVED",
            "outcome": "Explanation verified against peer interview logs.",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "RESOLVED"
    assert resolve_res.json()["resolved_at"] is not None


@pytest.mark.asyncio
async def test_coordinator_reports(client, sample_setup):
    token = sample_setup["coord_token"]
    res = await client.get(
        "/api/coordinator/reports",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    report = res.json()
    assert "communities_progress" in report
    assert "issues_summary" in report
    assert len(report["communities_progress"]) == 1
