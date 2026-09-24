import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models import SurveyRecord, FieldFeature

@pytest.mark.asyncio
async def test_feature_fails_survey_follows(client: AsyncClient, student_with_community, db: AsyncSession):
    student, community, token = student_with_community
    
    feature_id = "gps-feature-uuid-fail"
    survey_id = "gps-survey-uuid-fail"
    
    sync_payload = {
        "operations": [
            {
                "operation_id": "op-feat-fail",
                "operation_type": "CREATE",
                "entity_type": "FEATURE",
                "entity_id": feature_id,
                "payload": {
                    "feature_type": "HEALTH",
                    "latitude": 900.0, # invalid, will fail
                    "longitude": -1.234,
                    "accuracy_meters": 5.0
                }
            },
            {
                "operation_id": "op-surv-fail",
                "operation_type": "CREATE",
                "entity_type": "SURVEY",
                "entity_id": survey_id,
                "payload": {
                    "survey_type": "HEALTH",
                    "status": "DRAFT",
                    "field_feature_id": feature_id,
                    "answers": []
                }
            }
        ]
    }
    
    res = await client.post("/api/sync/operations", json=sync_payload, headers={"Authorization": f"Bearer {token}"})
    data = res.json()
    assert data["results"][0]["success"] is False
    assert data["results"][1]["success"] is False
    
    surv_res = await db.execute(select(SurveyRecord).where(SurveyRecord.id == survey_id))
    survey = surv_res.scalars().first()
    print("Survey saved:", survey.id if survey else "Not saved")
    print("field_feature_id:", survey.field_feature_id if survey else "Not saved")
