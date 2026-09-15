with open('frontend/src/app/dashboard/sync/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace(".equals(user.id)", ".equals(user.id as number)")
with open('frontend/src/app/dashboard/sync/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('frontend/src/app/dashboard/work/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace(".equals(user.id)", ".equals(user.id as number)")
with open('frontend/src/app/dashboard/work/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
