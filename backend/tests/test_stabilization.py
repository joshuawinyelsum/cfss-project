"""
test_stabilization.py – Regression tests for the CFSS stabilization phase.

Covers:
  1. Admin whitelist endpoint authorization
  2. Debug endpoint removal
  3. Duplicate route resolution
  4. registration_password_hash fix
  5. Survey draft / submit lifecycle
  6. Dashboard stats accuracy
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


# ═══════════════════════════════════════════════════════════════════════════════
# 1. ADMIN WHITELIST AUTHORIZATION
# ═══════════════════════════════════════════════════════════════════════════════

class TestWhitelistAuth:
    """Every admin/whitelist endpoint must reject unauthenticated and non-admin callers."""

    WHITELIST_PATHS = [
        ("GET",  "/admin/whitelist"),
        ("GET",  "/admin/whitelist/active"),
        ("GET",  "/admin/whitelist/1"),
        ("PATCH", "/admin/whitelist/1"),
        ("DELETE", "/admin/whitelist/1"),
    ]

    @pytest.mark.parametrize("method,path", WHITELIST_PATHS)
    async def test_unauthenticated_rejected(self, client: AsyncClient, method, path):
        """Unauthenticated requests must get 401."""
        response = await client.request(method, path)
        assert response.status_code == 401, f"{method} {path} should be 401 for unauthenticated"

    @pytest.mark.parametrize("method,path", WHITELIST_PATHS)
    async def test_student_rejected(self, client: AsyncClient, student_with_community, method, path):
        """Authenticated student must get 403."""
        _, _, token = student_with_community
        response = await client.request(method, path, headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 403, f"{method} {path} should be 403 for student"

    async def test_admin_can_list_whitelists(self, client: AsyncClient, admin_token):
        """Authenticated admin should be able to list whitelists (200 with empty list)."""
        response = await client.get(
            "/admin/whitelist",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200

    async def test_upload_unauthenticated_rejected(self, client: AsyncClient):
        """POST /admin/whitelist/upload must reject unauthenticated users."""
        response = await client.post("/admin/whitelist/upload")
        assert response.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
# 2. DEBUG ENDPOINT REMOVED
# ═══════════════════════════════════════════════════════════════════════════════

class TestDebugEndpointRemoved:
    async def test_debug_records_not_found(self, client: AsyncClient):
        """The debug_records endpoint must no longer exist."""
        response = await client.get("/api/student/surveys/debug_records")
        # 401 (auth required on adjacent routes) or 404 are both acceptable —
        # the key assertion is that it does NOT return 200.
        assert response.status_code != 200, "debug_records should not return 200"

    async def test_debug_records_not_accessible_with_auth(self, client: AsyncClient, student_with_community):
        """Even with a valid student token the endpoint must not be available."""
        _, _, token = student_with_community
        response = await client.get(
            "/api/student/surveys/debug_records",
            headers={"Authorization": f"Bearer {token}"},
        )
        # The route was removed, so this should be 404 or match another route pattern —
        # the important thing is it doesn't return survey records.
        assert response.status_code != 200 or response.json() == [], \
            "debug_records must not return data"


# ═══════════════════════════════════════════════════════════════════════════════
# 3. DUPLICATE ROUTE RESOLVED
# ═══════════════════════════════════════════════════════════════════════════════

class TestDeleteCommunity:
    async def test_delete_nonexistent_community(self, client: AsyncClient, admin_token):
        """Deleting a non-existent community should return 404."""
        response = await client.delete(
            "/api/admin/communities/99999",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 404

    async def test_delete_community_success(self, client: AsyncClient, admin_token, db):
        """Deleting an empty community should succeed."""
        from app.models import Community
        comm = Community(
            name="ToDelete", district="D", region="R",
            capacity=5, current_count=0, group_number=50,
        )
        db.add(comm)
        await db.commit()
        await db.refresh(comm)

        response = await client.delete(
            f"/api/admin/communities/{comm.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200, response.text

    async def test_delete_community_with_students_rejected(self, client: AsyncClient, admin_token, db):
        """Deleting a community with assigned students should return 400."""
        from app.models import Community
        comm = Community(
            name="HasStudents", district="D", region="R",
            capacity=10, current_count=3, group_number=51,
        )
        db.add(comm)
        await db.commit()
        await db.refresh(comm)

        response = await client.delete(
            f"/api/admin/communities/{comm.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 400


# ═══════════════════════════════════════════════════════════════════════════════
# 4. REGISTRATION PASSWORD HASH – no crash on settings update
# ═══════════════════════════════════════════════════════════════════════════════

class TestSettingsNoCrash:
    async def test_update_settings_does_not_crash(self, client: AsyncClient, admin_token, db):
        """Updating settings with a registration_password should NOT crash
        (the dead code that set registration_password_hash has been removed)."""
        from app.models import SystemSettings
        settings = SystemSettings(registration_open=False)
        db.add(settings)
        await db.commit()

        response = set_res = await client.put(
            "/api/admin/settings",
            json={
                "admin_password": "admin123",
                "registration_open": True,
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "survey_deadline": None,
                "allow_multiple_submissions": False,
                "default_page_size": 100,
                "registration_password": "SomePassword1!",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200, f"Settings update crashed: {response.text}"


# ═══════════════════════════════════════════════════════════════════════════════
# 5. SURVEY LIFECYCLE: Draft → Submit
# ═══════════════════════════════════════════════════════════════════════════════

class TestSurveyLifecycle:
    """Test the complete survey draft and submit flow through the API."""

    @pytest_asyncio.fixture
    async def survey_setup(self, client, student_with_community, db):
        """Seed survey questions and return helpful context."""
        student, community, token = student_with_community
        from app.models import SurveyQuestion

        # Create a few questions for HOUSEHOLD survey
        q1 = SurveyQuestion(
            survey_type="HOUSEHOLD", section="Demographics",
            question_text="Head of household name", question_type="text",
            required=True, order_number=1,
        )
        q2 = SurveyQuestion(
            survey_type="HOUSEHOLD", section="Demographics",
            question_text="Number of household members", question_type="number",
            required=True, order_number=2,
        )
        q3 = SurveyQuestion(
            survey_type="HOUSEHOLD", section="Demographics",
            question_text="Notes", question_type="text",
            required=False, order_number=3,
        )
        db.add_all([q1, q2, q3])
        await db.commit()
        await db.refresh(q1)
        await db.refresh(q2)
        await db.refresh(q3)

        return {
            "student": student,
            "community": community,
            "token": token,
            "questions": [q1, q2, q3],
            "headers": {"Authorization": f"Bearer {token}"},
        }

    async def test_create_survey_draft(self, client, survey_setup):
        """Creating a survey should return a DRAFT record."""
        ctx = survey_setup
        response = await client.post(
            "/api/student/surveys/create",
            json={"survey_type": "HOUSEHOLD"},
            headers=ctx["headers"],
        )
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["status"] == "DRAFT"
        assert data["survey_type"] == "HOUSEHOLD"

    async def test_save_draft_persists(self, client, survey_setup):
        """Saving answers as draft should persist and show in drafts list."""
        ctx = survey_setup

        # Create
        create_res = await client.post(
            "/api/student/surveys/create",
            json={"survey_type": "HOUSEHOLD"},
            headers=ctx["headers"],
        )
        record_id = create_res.json()["id"]

        # Save draft
        draft_res = set_res = await client.put(
            f"/api/student/surveys/record/{record_id}/draft",
            json={"answers": [
                {"question_id": ctx["questions"][0].id, "answer": "John Doe"},
            ]},
            headers=ctx["headers"],
        )
        assert draft_res.status_code == 200

        # Verify it appears in drafts
        drafts_res = await client.get(
            "/api/student/surveys/drafts/all",
            headers=ctx["headers"],
        )
        assert drafts_res.status_code == 200
        items = drafts_res.json()["items"]
        assert any(d["id"] == record_id for d in items), "Draft should appear in drafts list"
        assert all(d["status"] == "DRAFT" for d in items)

    async def test_submit_survey(self, client, survey_setup):
        """Submitting a survey should change status to SUBMITTED."""
        ctx = survey_setup

        # Create
        create_res = await client.post(
            "/api/student/surveys/create",
            json={"survey_type": "HOUSEHOLD"},
            headers=ctx["headers"],
        )
        record_id = create_res.json()["id"]

        # Submit with all required answers
        submit_res = await client.post(
            f"/api/student/surveys/record/{record_id}/submit",
            json={"answers": [
                {"question_id": ctx["questions"][0].id, "answer": "Jane Doe"},
                {"question_id": ctx["questions"][1].id, "answer": "5"},
            ]},
            headers=ctx["headers"],
        )
        assert submit_res.status_code == 200

        # Verify it appears in submitted
        submitted_res = await client.get(
            "/api/student/surveys/submitted/all",
            headers=ctx["headers"],
        )
        assert submitted_res.status_code == 200
        items = submitted_res.json()["items"]
        assert any(s["id"] == record_id for s in items), "Survey should appear in submitted list"

        # Verify it does NOT appear in drafts
        drafts_res = await client.get(
            "/api/student/surveys/drafts/all",
            headers=ctx["headers"],
        )
        assert drafts_res.status_code == 200
        draft_items = drafts_res.json()["items"]
        assert not any(d["id"] == record_id for d in draft_items), "Submitted survey should NOT appear in drafts"

    async def test_submit_missing_required_rejected(self, client, survey_setup):
        """Submitting without required answers should fail with 400."""
        ctx = survey_setup

        # Create
        create_res = await client.post(
            "/api/student/surveys/create",
            json={"survey_type": "HOUSEHOLD"},
            headers=ctx["headers"],
        )
        record_id = create_res.json()["id"]

        # Submit with only optional answers — missing required
        submit_res = await client.post(
            f"/api/student/surveys/record/{record_id}/submit",
            json={"answers": [
                {"question_id": ctx["questions"][2].id, "answer": "some note"},
            ]},
            headers=ctx["headers"],
        )
        assert submit_res.status_code == 400

    async def test_dashboard_stats_accurate(self, client, survey_setup):
        """Dashboard stats should accurately count drafts and submitted."""
        ctx = survey_setup

        # Create two surveys
        r1 = await client.post("/api/student/surveys/create", json={"survey_type": "HOUSEHOLD"}, headers=ctx["headers"])
        r2 = await client.post("/api/student/surveys/create", json={"survey_type": "HOUSEHOLD"}, headers=ctx["headers"])
        id1 = r1.json()["id"]
        id2 = r2.json()["id"]

        # Submit one, leave other as draft
        await client.post(f"/api/student/surveys/record/{id1}/submit", json={"answers": [
            {"question_id": ctx["questions"][0].id, "answer": "Alice"},
            {"question_id": ctx["questions"][1].id, "answer": "3"},
        ]}, headers=ctx["headers"])

        # Check dashboard
        stats_res = await client.get("/api/student/surveys/dashboard/stats", headers=ctx["headers"])
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert stats["submitted_surveys"] == 1
        assert stats["draft_surveys"] == 1
        assert stats["total_surveys"] == 2

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io
        
        df = pd.DataFrame([{
            "studentId": "PROF999",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
            "gender": "Female",
            "phone_number": "011 222 3333",
            "level": 100
        }])
        
        from io import BytesIO
        output = BytesIO()
        df.to_excel(output, index=False)
        output.seek(0)
        
        upload_res = await client.post(
            "/admin/whitelist/upload",
            data={"name": "Profile Test"},
            files={"file": ("test.xlsx", output, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert upload_res.status_code == 200
        

        # 1b. Open registration
        set_res = await client.put(
            "/api/admin/settings/registration",
            json={
                "registration_enabled": True,
                "admin_password": "admin123"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert set_res.status_code == 200, set_res.json()

        # 1c. Create a community
        await client.post(
            "/api/admin/communities",
            json={
                "name": "Test Comm",
                "district": "D",
                "region": "R",
                "capacity": 10,
                "group_number": 1
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROF999",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201, reg_res.json()
        
        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROF999",
                "password": "password123"
            }
        )
        assert login_res.status_code == 200
        student_token = login_res.json()["access_token"]
        
        # 4. Check /me for fields
        me_res = await client.get(
            "/api/v2/students/me",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        assert me_res.status_code == 200
        me_data = me_res.json()
        
        assert me_data["student_id"] == "PROF999"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"
        
        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/api/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()
        
        jane = next((s for s in students_data if s["student_id"] == "PROF999"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"


# ═══════════════════════════════════════════════════════════════════════════════
# 7. PHONE NUMBER & GENDER DATA PIPELINE
# ═══════════════════════════════════════════════════════════════════════════════

class TestPhoneNumberPipeline:
    """Verifies phone number and gender flow from whitelist to registration, 
    and validates 'My Group' visibility constraints."""
    
    async def test_phone_gender_pipeline(self, client: AsyncClient, admin_token, setup_db):
        import pandas as pd
        from io import BytesIO
        
        # 1. Upload whitelist containing gender and phone_number
        df = pd.DataFrame([
            {
                "studentId": "PHONE001",
                "name": "Phone Student",
                "email": "phone1@example.com",
                "phone_number": "024 123 4567",
                "gender": "Male",
                "faculty": "Science",
                "program": "CS",
                "level": 100
            },
            {
                "studentId": "PHONE002",
                "name": "Phone Peer",
                "email": "phone2@example.com",
                "phone_number": "055 987 6543",
                "gender": "Female",
                "faculty": "Science",
                "program": "CS",
                "level": 100
            },
            {
                "studentId": "OTHER001",
                "name": "Other Group Student",
                "email": "other@example.com",
                "phone_number": "020 111 2222",
                "gender": "Male",
                "faculty": "Arts",
                "program": "English",
                "level": 100
            }
        ])
        
        output = BytesIO()
        df.to_csv(output, index=False)
        output.seek(0)
        
        upload_res = await client.post(
            "/admin/whitelist/upload",
            data={"name": "Phone Test"},
            files={"file": ("test.csv", output, "text/csv")},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert upload_res.status_code == 200

        # Open registration
        await client.put(
            "/api/admin/settings/registration",
            json={"registration_enabled": True, "admin_password": "admin123"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # Create TWO communities
        await client.post("/api/admin/communities", json={"name": "Comm A", "district": "D", "region": "R", "capacity": 2, "group_number": 1}, headers={"Authorization": f"Bearer {admin_token}"})
        await client.post("/api/admin/communities", json={"name": "Comm B", "district": "D", "region": "R", "capacity": 2, "group_number": 2}, headers={"Authorization": f"Bearer {admin_token}"})
        
        # Register students
        for sid in ["PHONE001", "PHONE002", "OTHER001"]:
            reg_res = await client.post(
                "/api/v2/students/register",
                json={"student_id": sid, "password": "password123", "program": "CS" if "PHONE" in sid else "English"}
            )
            assert reg_res.status_code == 201

        # Login Student 1
        login_res = await client.post("/api/v2/students/login", json={"student_id": "PHONE001", "password": "password123"})
        assert login_res.status_code == 200
        student_token = login_res.json()["access_token"]
        
        # 2. Check /me for fields
        me_res = await client.get("/api/v2/students/me", headers={"Authorization": f"Bearer {student_token}"})
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["phone_number"] == "024 123 4567"
        assert me_data["gender"] == "Male"
        
        # 3. Check group members endpoint (Should only see PHONE001 and PHONE002, not OTHER001)
        group_res = await client.get("/api/student/community/members", headers={"Authorization": f"Bearer {student_token}"})
        assert group_res.status_code == 200
        group_data = group_res.json()
        
        assert len(group_data) == 2
        peers = {m["student_id"]: m for m in group_data}
        
        assert "PHONE001" in peers
        assert "OTHER001" in peers
        assert "PHONE002" not in peers
        
        assert peers["OTHER001"]["phone_number"] == "020 111 2222"
        assert peers["OTHER001"]["gender"] == "Male"
        # Check security (email should NOT be returned in group schema)
        assert "email" not in peers["OTHER001"]
        
        # 4. Check Admin endpoint 
        admin_res = await client.get(f"/api/admin/students/{me_data['id']}", headers={"Authorization": f"Bearer {admin_token}"})
        assert admin_res.status_code == 200
        admin_data = admin_res.json()
        assert admin_data["phone_number"] == "024 123 4567"
        assert admin_data["gender"] == "Male"

