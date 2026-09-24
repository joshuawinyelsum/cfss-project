import re

with open('frontend/src/lib/db.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add version 9
new_version = """    // Version 8 adds communities local store for offline spatial metadata
    this.version(8).stores({
      surveys: 'id, student_id, survey_type, status, sync_status, updated_at',
      definitions: 'type',
      features: 'id, student_id, feature_type, sync_status, updated_at',
      communities: 'id',
      sync_operations: 'id, student_id, operation_type, entity_type, entity_id, status, created_at'
    });

    // Version 9 adds community_id index to features for spatial map rendering
    this.version(9).stores({
      surveys: 'id, student_id, survey_type, status, sync_status, updated_at',
      definitions: 'type',
      features: 'id, student_id, community_id, feature_type, sync_status, updated_at',
      communities: 'id',
      sync_operations: 'id, student_id, operation_type, entity_type, entity_id, status, created_at'
    });"""

content = re.sub(r'// Version 8 adds communities local store for offline spatial metadata.*?sync_operations:.*?\}\);', new_version, content, flags=re.DOTALL)

with open('frontend/src/lib/db.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Dexie schema updated to version 9")
