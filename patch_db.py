content = open('frontend/src/lib/db.ts', 'r').read()
content = content.replace("entity_type: 'SURVEY' | 'FEATURE';", "entity_type: 'SURVEY' | 'FEATURE' | 'COMMUNITY';")
open('frontend/src/lib/db.ts', 'w').write(content)
