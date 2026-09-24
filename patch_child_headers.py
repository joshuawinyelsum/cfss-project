import re
import glob

files = [
    'frontend/src/app/dashboard/work/drafts/page.tsx',
    'frontend/src/app/dashboard/work/submitted/page.tsx',
    'frontend/src/app/dashboard/work/attention/page.tsx'
]

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove the back button entirely
    content = re.sub(r'<div className="mb-4">\s*<Link href="/dashboard/work".*?</Link>\s*</div>', '', content, flags=re.DOTALL)
    
    # Change h1 to h2 and text-2xl to text-lg or text-xl
    content = content.replace('<h1 className="text-2xl', '<h2 className="text-xl')
    content = content.replace('</h1>', '</h2>')

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Updated child pages to remove back buttons and downgrade headers")
