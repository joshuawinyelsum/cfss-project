import pytest
import os
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from sqlalchemy import text
from app.main import app
from app.database import engine, get_db, Base
from app.models import User, PasswordResetToken
from app.auth import get_password_hash, verify_password
import hashlib
import datetime

os.environ["FRONTEND_URL"] = "http://test-url"

from sqlalchemy.ext.asyncio import AsyncSession
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)

@pytest.mark.asyncio
async def test_recovery_lifecycle_pg():
    test_email = "pg_recovery_test@example.com"
    
    async with TestingSessionLocal() as pg_db_session:
        await pg_db_session.execute(text(f"DELETE FROM users WHERE email = '{test_email}'"))
        await pg_db_session.commit()
        
        user = User(
            student_id="PG_TEST",
            name="PG Test User",
            email=test_email,
            password_hash=get_password_hash("pg_old_password"),
            level=100,
            role="admin"  # Admin role to enforce strict password policy
        )
        pg_db_session.add(user)
        await pg_db_session.commit()
        await pg_db_session.refresh(user)
        user_id = user.id
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Mock celery delay to capture URL
        import app.routers.recovery_router as rr
        original_delay = rr.send_password_reset_email.delay
        captured_urls = []
        
        def mock_delay(*args, **kwargs):
            captured_urls.append(kwargs.get("reset_url"))
            
        rr.send_password_reset_email.delay = mock_delay
        
        # 1. Request recovery 1
        await client.post("/api/v2/auth/recover", json={"email": test_email})
        token_1_url = captured_urls[-1]
        raw_token_1 = token_1_url.split("token=")[1]
        
        # 2. Request recovery 2 (tests invalidation of previous)
        await client.post("/api/v2/auth/recover", json={"email": test_email})
        token_2_url = captured_urls[-1]
        raw_token_2 = token_2_url.split("token=")[1]
        
        # Verify Token 1 is gone and Token 2 is hashed
        expected_hash_2 = hashlib.sha256(raw_token_2.encode()).hexdigest()
        async with TestingSessionLocal() as pg_db_session:
            result = await pg_db_session.execute(select(PasswordResetToken).where(PasswordResetToken.user_id == user_id))
            tokens = result.scalars().all()
            assert len(tokens) == 1
            assert tokens[0].token == expected_hash_2
            
        # 3. Submit weak password
        res = await client.post("/api/v2/auth/reset-password", json={
            "token": raw_token_2,
            "new_password": "weak",
            "confirm_new_password": "weak"
        })
        # 4. Assert 400
        assert res.status_code == 400
        assert "Password must be at least" in res.json()["detail"]
        
        # 5. Verify reset token still exists
        async with TestingSessionLocal() as pg_db_session:
            result = await pg_db_session.execute(select(PasswordResetToken).where(PasswordResetToken.user_id == user_id))
            assert result.scalars().first() is not None
            
        # 6. Submit mismatched confirmation
        res = await client.post("/api/v2/auth/reset-password", json={
            "token": raw_token_2,
            "new_password": "PgNewPassword123!",
            "confirm_new_password": "WrongPassword123!"
        })
        # 7. Assert 400
        assert res.status_code == 400
        assert "Passwords do not match" in res.json()["detail"]
        
        # 8. Verify token still exists
        async with TestingSessionLocal() as pg_db_session:
            result = await pg_db_session.execute(select(PasswordResetToken).where(PasswordResetToken.user_id == user_id))
            assert result.scalars().first() is not None
            
        # 9. Submit valid password
        res = await client.post("/api/v2/auth/reset-password", json={
            "token": raw_token_2,
            "new_password": "PgNewPassword123!",
            "confirm_new_password": "PgNewPassword123!"
        })
        # 10. Assert 200
        assert res.status_code == 200
        
        # 11. Verify token is deleted
        async with TestingSessionLocal() as pg_db_session:
            result = await pg_db_session.execute(select(PasswordResetToken).where(PasswordResetToken.user_id == user_id))
            assert result.scalars().first() is None
            
        # 12 & 13. Verify old password fails, new password works
        async with TestingSessionLocal() as pg_db_session:
            result = await pg_db_session.execute(select(User).where(User.id == user_id))
            updated_user = result.scalars().first()
            assert not verify_password("pg_old_password", updated_user.password_hash)
            assert verify_password("PgNewPassword123!", updated_user.password_hash)
            
        # 14. Attempt reuse of consumed token
        res = await client.post("/api/v2/auth/reset-password", json={
            "token": raw_token_2,
            "new_password": "AnotherPassword123!",
            "confirm_new_password": "AnotherPassword123!"
        })
        assert res.status_code == 400
        
        # 15 & 16. Test expired token
        raw_token_expired = "expired_token_raw"
        hashed_expired = hashlib.sha256(raw_token_expired.encode()).hexdigest()
        async with TestingSessionLocal() as pg_db_session:
            import datetime
            
            past_time = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=2)
            expired_token_obj = PasswordResetToken(user_id=user_id, token=hashed_expired, expires_at=past_time)
            pg_db_session.add(expired_token_obj)
            await pg_db_session.commit()
            
        res = await client.post("/api/v2/auth/reset-password", json={
            "token": raw_token_expired,
            "new_password": "AnotherPassword123!",
            "confirm_new_password": "AnotherPassword123!"
        })
        assert res.status_code == 400
        
        # Verify it was cleaned up
        async with TestingSessionLocal() as pg_db_session:
            result = await pg_db_session.execute(select(PasswordResetToken).where(PasswordResetToken.user_id == user_id))
            assert result.scalars().first() is None
        
        # Restore mock
        rr.send_password_reset_email.delay = original_delay
        
    # Cleanup
    async with TestingSessionLocal() as pg_db_session:
        await pg_db_session.execute(text(f"DELETE FROM users WHERE id = {user_id}"))
        await pg_db_session.commit()

