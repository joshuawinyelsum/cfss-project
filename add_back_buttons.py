import os

pages = [
    'frontend/src/app/dashboard/group/page.tsx',
    'frontend/src/app/dashboard/sync/page.tsx',
    'frontend/src/app/profile/page.tsx',
    'frontend/src/app/settings/page.tsx'
]

back_btn_jsx = """
      {/* Mobile Back Navigation */}
      <div className="lg:hidden mb-4">
        <Link href="/dashboard/more" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} className="mr-1" /> Back to More
        </Link>
      </div>
"""

for page in pages:
    if not os.path.exists(page):
        continue
    with open(page, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "ArrowLeft" not in content:
        content = content.replace("import {", "import { ArrowLeft,")
    
    if "import Link from 'next/link';" not in content:
        content = "import Link from 'next/link';\n" + content
        
    # Find the main return div. They usually have `className="max-w-` or something similar, or just after `return (\n    <div`
    start_idx = content.find('return (\n    <div')
    if start_idx == -1:
        start_idx = content.find('return (\n    <main')
        
    if start_idx != -1:
        # Find the end of the opening tag
        end_tag_idx = content.find('>', start_idx)
        if end_tag_idx != -1:
            content = content[:end_tag_idx+1] + back_btn_jsx + content[end_tag_idx+1:]
            with open(page, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Added back button to {page}")
