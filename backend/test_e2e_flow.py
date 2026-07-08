import json
import urllib.request
import urllib.error
import uuid

BASE_URL = "http://127.0.0.1:8000"

def run_test():
    print("Testing End-to-End Flow...")
    
    # 1. Register a test student.
    student_id = "TST/2026/0001"
    email = "test.student@example.com"
    password = "Password1!"
    
    idempotency_key = str(uuid.uuid4())
    print(f"Registering student {student_id} with key {idempotency_key}...")
    
    req = urllib.request.Request(
        f"{BASE_URL}/api/v2/register",
        data=json.dumps({
            "studentId": student_id,
            "password": password
        }).encode('utf-8'),
        headers={
            "Idempotency-Key": idempotency_key,
            "Content-Type": "application/json"
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            print("Register Response:", response.status, response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print("Register Response:", e.code, e.read().decode('utf-8'))
    
    # 2. Login
    print(f"Logging in {student_id}...")
    req = urllib.request.Request(
        f"{BASE_URL}/api/v2/login",
        data=json.dumps({
            "student_id": student_id,
            "password": password
        }).encode('utf-8'),
        headers={
            "Content-Type": "application/json"
        },
        method="POST"
    )
    
    token = None
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode('utf-8')
            print("Login Response:", response.status, res_data)
            token = json.loads(res_data).get("access_token")
    except urllib.error.HTTPError as e:
        print("Login Response:", e.code, e.read().decode('utf-8'))
    
    if token:
        # 3. Get /me
        print("Fetching /api/auth/me...")
        req = urllib.request.Request(
            f"{BASE_URL}/api/auth/me",
            headers={
                "Authorization": f"Bearer {token}"
            }
        )
        try:
            with urllib.request.urlopen(req) as response:
                print("Me Response:", response.status, response.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            print("Me Response:", e.code, e.read().decode('utf-8'))

if __name__ == "__main__":
    run_test()
