
# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io

        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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

        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201

        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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

        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"

        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()

        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io
        
        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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
        
        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201
        
        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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
        
        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"
        
        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()
        
        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io
        
        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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
        
        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201
        
        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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
        
        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"
        
        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()
        
        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io
        
        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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
        
        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201
        
        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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
        
        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"
        
        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()
        
        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io
        
        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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
        
        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201
        
        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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
        
        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"
        
        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()
        
        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io
        
        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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
        
        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201
        
        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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
        
        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"
        
        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()
        
        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"

# -------------------------------------------------------------------------------
# 7. PROFILE DATA INTEGRITY (FULL NAME, EMAIL, FACULTY)
# -------------------------------------------------------------------------------

class TestProfileDataIntegrity:
    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):
        # 1. Create a whitelist with faculty and email
        import pandas as pd
        import io
        
        df = pd.DataFrame([{
            "studentId": "PROFILE01",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "faculty": "Science",
            "program": "CS",
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
        
        # 2. Register the student
        reg_res = await client.post(
            "/api/v2/students/register",
            json={
                "student_id": "PROFILE01",
                "password": "password123",
                "program": "CS"
            }
        )
        assert reg_res.status_code == 201
        
        # 3. Login
        login_res = await client.post(
            "/api/v2/students/login",
            json={
                "student_id": "PROFILE01",
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
        
        assert me_data["student_id"] == "PROFILE01"
        assert me_data["full_name"] == "Jane Doe"
        assert me_data["email"] == "jane@example.com"
        assert me_data["faculty"] == "Science"
        assert me_data["program"] == "cs"
        
        # 5. Check admin students list for fields
        admin_students_res = await client.get(
            "/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_students_res.status_code == 200
        students_data = admin_students_res.json()
        
        jane = next((s for s in students_data if s["student_id"] == "PROFILE01"), None)
        assert jane is not None
        assert jane["name"] == "Jane Doe"
        assert jane["email"] == "jane@example.com"
        assert jane["faculty"] == "Science"
        assert jane["program"] == "cs"
