import re

with open('frontend/src/app/dashboard/work/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("you're", "you&apos;re")
content = content.replace("you've", "you&apos;ve")

with open('frontend/src/app/dashboard/work/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
