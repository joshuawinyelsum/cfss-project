import glob
for f in glob.glob('frontend/src/app/surveys/*/fill/page.tsx'):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    content = content.replace("router.push('/dashboard/surveys/submitted');", "router.push('/dashboard/work');")
    content = content.replace("router.push('/dashboard/surveys/drafts');", "router.push('/dashboard/work');")
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
print("Updated frontend routes")
