with open('frontend/src/app/dashboard/sync/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("b.updated_at - a.updated_at", "new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()")

with open('frontend/src/app/dashboard/sync/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
