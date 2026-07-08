import asyncio
import urllib.request
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models import User
from app.database import SessionLocal
from app.auth import create_access_token

async def get_token():
    async with SessionLocal() as db:
        result = await db.execute(select(User).filter(User.role == 'student').limit(1))
        user = result.scalars().first()
        if not user:
            return None
        return create_access_token({'sub': str(user.id), 'role': 'student'})

token = asyncio.run(get_token())
if token:
    req = urllib.request.Request(
        'http://localhost:8000/api/student/surveys/dashboard/stats', 
        headers={'Authorization': 'Bearer ' + token}
    )
    try:
        resp = urllib.request.urlopen(req)
        print("HTTP STATUS:", resp.status)
        print("RESPONSE:", resp.read().decode())
    except urllib.error.HTTPError as e:
        print("HTTP ERROR:", e.code)
        print("ERROR RESPONSE:", e.read().decode())
else:
    print("No student user found")
