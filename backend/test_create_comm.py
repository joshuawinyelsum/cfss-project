import urllib.request
import urllib.parse
import json

data = urllib.parse.urlencode({'username': 'admin', 'password': 'admin123'}).encode()
req = urllib.request.Request('http://127.0.0.1:8000/api/auth/admin/login', data=data)
with urllib.request.urlopen(req) as res:
    token = json.loads(res.read().decode())['access_token']

import uuid
req2 = urllib.request.Request(
    'http://127.0.0.1:8000/api/admin/communities',
    data=json.dumps({'name': f'Test Comm {uuid.uuid4()}', 'district': 'D', 'region': 'R', 'capacity': 10}).encode(),
    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
)

try:
    with urllib.request.urlopen(req2) as res2:
        print(res2.status)
        print(res2.read().decode())
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.read().decode())
