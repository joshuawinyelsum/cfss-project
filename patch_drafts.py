import re

with open('frontend/src/app/dashboard/work/drafts/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

back_button = """
        <div className="mb-4">
          <Link href="/dashboard/work" className="inline-flex items-center text-sm font-medium text-muted hover:text-primary transition-colors">
            &larr; Back to Work overview
          </Link>
        </div>"""

content = content.replace('<div className="space-y-6 max-w-3xl mx-auto pb-12">', f'<div className="space-y-6 max-w-3xl mx-auto pb-12">{back_button}')

with open('frontend/src/app/dashboard/work/drafts/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated drafts page")
