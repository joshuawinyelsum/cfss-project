import sys
content = open('frontend/src/lib/sync.ts', 'r').read()
content = content.replace("entityType: 'SURVEY' | 'FEATURE'", "entityType: 'SURVEY' | 'FEATURE' | 'COMMUNITY'")
content = content.replace("item.entity_type === 'FEATURE' ? db.features : db.surveys", "item.entity_type === 'COMMUNITY' ? db.communities : (item.entity_type === 'FEATURE' ? db.features : db.surveys)")
content = content.replace("op.entity_type === 'FEATURE' ? db.features : db.surveys", "op.entity_type === 'COMMUNITY' ? db.communities : (op.entity_type === 'FEATURE' ? db.features : db.surveys)")
content = content.replace("entityType === 'FEATURE' ? db.features : db.surveys", "entityType === 'COMMUNITY' ? db.communities : (entityType === 'FEATURE' ? db.features : db.surveys)")
content = content.replace("if (op.entity_type === 'FEATURE') {\n            await db.features.delete(op.entity_id);\n          } else {\n            await db.surveys.delete(op.entity_id);\n          }", "if (op.entity_type === 'COMMUNITY') { await db.communities.delete(parseInt(op.entity_id)); } else if (op.entity_type === 'FEATURE') { await db.features.delete(op.entity_id); } else { await db.surveys.delete(op.entity_id); }")
open('frontend/src/lib/sync.ts', 'w').write(content)
