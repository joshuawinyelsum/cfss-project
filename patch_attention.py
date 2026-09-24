import re

with open('frontend/src/app/dashboard/work/attention/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

back_button = """
      <div className="mb-4">
        <Link href="/dashboard/work" className="inline-flex items-center text-sm font-medium text-muted hover:text-primary transition-colors">
          <ArrowLeft size={16} className="mr-1" /> Back to Work overview
        </Link>
      </div>"""

# Replace the existing mobile back button with the universal one
pattern = r'<div className="lg:hidden mb-4">.*?</div>'
content = re.sub(pattern, back_button, content, flags=re.DOTALL)

with open('frontend/src/app/dashboard/work/attention/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated attention page")
