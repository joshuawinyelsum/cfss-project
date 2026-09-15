import re

files = [
    'frontend/src/app/dashboard/surveys/drafts/page.tsx',
    'frontend/src/app/dashboard/work/page.tsx'
]

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace("id: number) => {", "id: string) => {")
    content = content.replace("record.id as number", "record.id as string")
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed string id in {file_path}")
