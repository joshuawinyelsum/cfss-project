import re

with open('frontend/src/app/admin/layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<div className={`flex flex-col bg-cfss-green',
    '<div className={`hidden lg:flex flex-col bg-cfss-green'
)

with open('frontend/src/app/admin/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("layout.tsx sidebar hidden on mobile.")
