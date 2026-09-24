import httpx
import uuid
import datetime

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJDU0MvMDAxNy8yNSIsInJvbGUiOiJzdHVkZW50IiwiZXhwIjoxNzkwMjY4MjkxfQ.N4ID6zlQcbRu7I4h76SVuZ1sIUAPJ-38aKct0Jv9BUw"

record_id = str(uuid.uuid4())

# Mock payload as frontend creates it
payload = {
    "operations": [
        {
            "operation_id": str(uuid.uuid4()),
            "operation_type": "CREATE",
            "entity_type": "SURVEY",
            "entity_id": record_id,
            "payload": {
                "id": record_id,
                "survey_type": "HOUSEHOLD",
                "community_id": 1, # backend ignores this and uses current user's community
                "student_id": 1,
                "entity_id": "WILL_BE_OVERWRITTEN",
                "answers": [
                    {"question_id": "q1", "answer": "Yes"}
                ],
                "status": "SUBMITTED",
                "sync_status": "pending",
                "created_at": datetime.datetime.now().isoformat() + "Z",
                "updated_at": datetime.datetime.now().isoformat() + "Z",
                "submitted_at": datetime.datetime.now().isoformat() + "Z"
            }
        }
    ]
}

response = httpx.post(
    "http://localhost:8000/api/sync/operations",
    json=payload,
    headers={"Authorization": f"Bearer {token}"}
)

print(response.status_code)
print(response.json())
