import httpx
import json

base_url = "http://localhost:8000"

with httpx.Client(base_url=base_url) as client:
    # 1. Login to get token
    # Using admin just to get a token, but wait, the endpoint requires a student.
    # What's a valid student in the database?
    # I don't know the password of any student.
    
    # Wait, I can just create a test token directly using auth module.
    import sys
    sys.path.append(".")
    from app.auth import create_access_token
    from datetime import timedelta
    
    token = create_access_token({"sub": "1", "role": "student"}, timedelta(minutes=15))
    
    # Now send the PATCH request
    headers = {"Authorization": f"Bearer {token}"}
    res = client.patch("/api/student/settings", json={"theme": "dark"}, headers=headers)
    print(res.status_code)
    print(res.text)
