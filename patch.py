import sys
content = open('frontend/src/lib/sync.ts', 'r').read()

patch = '''
// Helper for typesafe store access
const getStore = (type: string) => type === 'COMMUNITY' ? db.communities : (type === 'FEATURE' ? db.features : db.surveys);
const getId = (type: string, id: string) => type === 'COMMUNITY' ? parseInt(id) : id;
'''

content = content.replace("const store = item.entity_type === 'COMMUNITY' ? db.communities : (item.entity_type === 'FEATURE' ? db.features : db.surveys);\n            await store.update(item.entity_id, { sync_status: 'syncing' });", "const store = getStore(item.entity_type);\n            await (store as any).update(getId(item.entity_type, item.entity_id), { sync_status: 'syncing' });")

content = content.replace("const store = op.entity_type === 'COMMUNITY' ? db.communities : (op.entity_type === 'FEATURE' ? db.features : db.surveys);\n            const record = await (store as any).get(op.entity_id);", "const store = getStore(op.entity_type);\n            const record = await (store as any).get(getId(op.entity_type, op.entity_id));")

content = content.replace("const store = op.entity_type === 'COMMUNITY' ? db.communities : (op.entity_type === 'FEATURE' ? db.features : db.surveys);\n                 await store.update(op.entity_id", "const store = getStore(op.entity_type);\n                 await (store as any).update(getId(op.entity_type, op.entity_id)")

content = content.replace("const store = item.entity_type === 'COMMUNITY' ? db.communities : (item.entity_type === 'FEATURE' ? db.features : db.surveys);\n           await store.update(item.entity_id", "const store = getStore(item.entity_type);\n           await (store as any).update(getId(item.entity_type, item.entity_id)")

content = content.replace("const store = entityType === 'COMMUNITY' ? db.communities : (entityType === 'FEATURE' ? db.features : db.surveys);\n        await (store as any).put(payload);", "const store = getStore(entityType);\n        await (store as any).put(payload);")

content = content.replace("const store = entityType === 'COMMUNITY' ? db.communities : (entityType === 'FEATURE' ? db.features : db.surveys);\n           await (store as any).delete(entityId);", "const store = getStore(entityType);\n           await (store as any).delete(getId(entityType, entityId));")

content = content.replace("const store = entityType === 'COMMUNITY' ? db.communities : (entityType === 'FEATURE' ? db.features : db.surveys);\n           await (store as any).update(entityId, { sync_status: 'pending', status: 'DELETED' });", "const store = getStore(entityType);\n           await (store as any).update(getId(entityType, entityId), { sync_status: 'pending', status: 'DELETED' });")

content = patch + content

open('frontend/src/lib/sync.ts', 'w').write(content)
