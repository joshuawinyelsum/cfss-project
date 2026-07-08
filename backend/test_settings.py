import httpx

with httpx.Client(base_url="http://localhost:8000") as client:
    res = client.patch("/api/student/settings", json={"theme": "dark"})
    print(res.status_code)
    print(res.text)
