import pytest
import pytest_asyncio
from app import models, auth

@pytest_asyncio.fixture
async def seeded_admin(db):
    """Seed a known admin account for login testing."""
    admin = models.User(
        student_id="ADMIN",
        name="System Administrator",
        email="admin@cfss.local",
        password_hash=auth.get_password_hash("CfssAdmin2026!SecureKey"),
        role="admin",
        level=0,
        is_active=True,
        is_verified=True,
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    return admin

@pytest.mark.asyncio
async def test_admin_login_success_lowercase_username(client, seeded_admin):
    """1. Valid administrator credentials with lowercase username ('admin')."""
    res = await client.post(
        "/api/auth/admin/login",
        data={"username": "admin", "password": "CfssAdmin2026!SecureKey"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_admin_login_success_uppercase_username(client, seeded_admin):
    """Valid administrator credentials with uppercase username ('ADMIN')."""
    res = await client.post(
        "/api/auth/admin/login",
        data={"username": "ADMIN", "password": "CfssAdmin2026!SecureKey"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data

@pytest.mark.asyncio
async def test_admin_login_success_email(client, seeded_admin):
    """Valid administrator credentials with email identifier ('admin@cfss.local')."""
    res = await client.post(
        "/api/auth/admin/login",
        data={"username": "admin@cfss.local", "password": "CfssAdmin2026!SecureKey"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data

@pytest.mark.asyncio
async def test_admin_login_rejects_incorrect_password(client, seeded_admin):
    """2. Incorrect password returns 401 with 'Incorrect admin credentials'."""
    res = await client.post(
        "/api/auth/admin/login",
        data={"username": "admin", "password": "wrongpassword123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Incorrect admin credentials"

@pytest.mark.asyncio
async def test_admin_login_rejects_unknown_username(client, seeded_admin):
    """3. Unknown username returns 401 with consistent error message."""
    res = await client.post(
        "/api/auth/admin/login",
        data={"username": "unknown_admin_user", "password": "CfssAdmin2026!SecureKey"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Incorrect admin credentials"

@pytest.mark.asyncio
async def test_admin_login_missing_or_empty_fields(client, seeded_admin):
    """4. Missing or malformed login fields."""
    # Empty username
    res_empty_user = await client.post(
        "/api/auth/admin/login",
        data={"username": "   ", "password": "CfssAdmin2026!SecureKey"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert res_empty_user.status_code in (401, 422)

    # Empty password
    res_empty_pwd = await client.post(
        "/api/auth/admin/login",
        data={"username": "admin", "password": ""},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert res_empty_pwd.status_code in (401, 422)

@pytest.mark.asyncio
async def test_admin_token_validation_and_protected_access(client, seeded_admin):
    """5 & 6. Token generation and protected endpoint access using valid token."""
    # 1. Login to get token
    res = await client.post(
        "/api/auth/admin/login",
        data={"username": "admin", "password": "CfssAdmin2026!SecureKey"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert res.status_code == 200
    token = res.json()["access_token"]

    # 2. Access /api/auth/me
    me_res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["student_id"] == "ADMIN"
    assert me_data["role"] == "admin"
    assert me_data["email"] == "admin@cfss.local"

    # 3. Access protected admin settings
    settings_res = await client.get("/api/admin/settings", headers={"Authorization": f"Bearer {token}"})
    assert settings_res.status_code == 200

@pytest.mark.asyncio
async def test_unauthorized_access_without_token(client):
    """7. Unauthorized access without a token is rejected with 401."""
    res = await client.get("/api/admin/settings")
    assert res.status_code == 401

@pytest.mark.asyncio
async def test_student_token_forbidden_on_admin_endpoint(client, student_with_community):
    """Student tokens cannot access admin endpoints (403 Forbidden)."""
    _, _, student_token = student_with_community
    res = await client.get("/api/admin/settings", headers={"Authorization": f"Bearer {student_token}"})
    assert res.status_code == 403
    assert "privileges" in res.json()["detail"].lower()

@pytest.mark.asyncio
async def test_deactivated_admin_rejected(client, db, seeded_admin):
    """Deactivated admin account is rejected upon login."""
    seeded_admin.is_active = False
    await db.commit()

    res = await client.post(
        "/api/auth/admin/login",
        data={"username": "admin", "password": "CfssAdmin2026!SecureKey"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Incorrect admin credentials"

@pytest.mark.asyncio
async def test_cors_preflight_allows_vercel_and_local(client):
    """9. Regression: CORS preflight allows Vercel deployments and rejects untrusted origins."""
    # Vercel preview / production origin
    res_vercel = await client.options(
        "/api/auth/admin/login",
        headers={
            "Origin": "https://cfss-project.vercel.app",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type"
        }
    )
    assert res_vercel.status_code == 200
    assert res_vercel.headers.get("access-control-allow-origin") == "https://cfss-project.vercel.app"

    # Untrusted / attacker origin is rejected
    res_evil = await client.options(
        "/api/auth/admin/login",
        headers={
            "Origin": "https://attacker.example.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type"
        }
    )
    assert res_evil.status_code == 400
    assert "access-control-allow-origin" not in res_evil.headers
