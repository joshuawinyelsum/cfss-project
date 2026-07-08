import urllib.request
import json

base_url = "http://127.0.0.1:8000/api/v2/students"

def register():
    data = json.dumps({"student_id": "test/1234/5678", "program": "Computer Science", "password": "password123"}).encode("utf-8")
    req = urllib.request.Request(f"{base_url}/register", data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as response:
            print("Register:", response.read().decode())
    except urllib.error.HTTPError as e:
        print("Register Error:", e.read().decode())

def login():
    data = json.dumps({"student_id": "test/1234/5678", "password": "password123"}).encode("utf-8")
    req = urllib.request.Request(f"{base_url}/login", data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            print("Login:", "Success (token hidden)")
            return res_data["access_token"]
    except urllib.error.HTTPError as e:
        print("Login Error:", e.read().decode())
        return None

def get_me(token):
    req = urllib.request.Request(f"{base_url}/me", headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req) as response:
            print("Me:", response.read().decode())
    except urllib.error.HTTPError as e:
        print("Me Error:", e.read().decode())

register()
token = login()
if token:
    get_me(token)
