import uuid
from fastapi.testclient import TestClient
from app.main import app

def test():
    client = TestClient(app)
    login_res = client.post("/api/auth/admin/login", data={"username": "admin", "password": "admin123"})
    token = login_res.json().get("access_token")
    print(f"Token: {token}")
    
    try:
        res = client.get(
            "/api/admin/students",
            headers={"Authorization": f"Bearer {token}"}
        )
        print("Students:")
        print(res.status_code)
        print(res.text)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test()
