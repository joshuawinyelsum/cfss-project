import urllib.request
import urllib.parse
import json

# 1. Login to get token
data = urllib.parse.urlencode({"username": "admin", "password": "admin123"}).encode("utf-8")
req = urllib.request.Request("http://127.0.0.1:8000/api/auth/admin/login", data=data)
try:
    with urllib.request.urlopen(req) as res:
        res_data = json.loads(res.read().decode())
        token = res_data.get("access_token")
        print(f"Token: {token[:20]}...")
except Exception as e:
    print(f"Login failed: {e}")
    exit(1)

# 2. Test export students
print("\nTesting /admin/export/students ...")
req = urllib.request.Request(
    "http://127.0.0.1:8000/admin/export/students",
    headers={"Authorization": f"Bearer {token}"}
)
try:
    with urllib.request.urlopen(req) as res:
        print(f"Status: {res.status}")
except urllib.error.HTTPError as e:
    print(f"Status: {e.code}")
    print(e.read().decode())

# 3. Test export surveys
print("\nTesting /admin/export/surveys ...")
req = urllib.request.Request(
    "http://127.0.0.1:8000/admin/export/surveys",
    headers={"Authorization": f"Bearer {token}"}
)
try:
    with urllib.request.urlopen(req) as res:
        print(f"Status: {res.status}")
except urllib.error.HTTPError as e:
    print(f"Status: {e.code}")
    print(e.read().decode())

print("\nDone.")
