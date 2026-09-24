import re

with open('frontend/src/app/dashboard/map/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("await db.features.filter(f => f.community_id === user.community_id).toArray()", "await db.features.where('community_id').equals(user.community_id!).toArray()")

with open('frontend/src/app/dashboard/map/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated page.tsx back to where()")
