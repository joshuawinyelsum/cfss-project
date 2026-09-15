with open('frontend/src/app/dashboard/work/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("serverRecent.forEach(sr => {", "serverRecent.forEach((sr: any) => {")

with open('frontend/src/app/dashboard/work/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
