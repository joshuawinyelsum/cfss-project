import re

with open('backend/app/routers/sync_router.py', 'r', encoding='utf-8') as f:
    content = f.read()

# For CREATE block: add flush after record is configured
target = """
                    req_feature_id = survey_data.get("field_feature_id")
                    if req_feature_id:
                        feat_check = await db.execute(select(models.FieldFeature).where(models.FieldFeature.id == req_feature_id))
                        feat_obj = feat_check.scalars().first()
                        if not feat_obj:
                            raise ValueError(f"FieldFeature {req_feature_id} not found")
                        if feat_obj.community_id != comm_id:
                            raise ValueError(f"FieldFeature {req_feature_id} belongs to a different community")
                        record.field_feature_id = req_feature_id

                # Insert answers for both CREATE and UPDATE
"""

replacement = """
                    req_feature_id = survey_data.get("field_feature_id")
                    if req_feature_id:
                        feat_check = await db.execute(select(models.FieldFeature).where(models.FieldFeature.id == req_feature_id))
                        feat_obj = feat_check.scalars().first()
                        if not feat_obj:
                            raise ValueError(f"FieldFeature {req_feature_id} not found")
                        if feat_obj.community_id != comm_id:
                            raise ValueError(f"FieldFeature {req_feature_id} belongs to a different community")
                        record.field_feature_id = req_feature_id
                        
                    await db.flush()

                # Insert answers for both CREATE and UPDATE
"""
content = content.replace(target, replacement)

with open('backend/app/routers/sync_router.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Added await db.flush() to sync_router.py")
