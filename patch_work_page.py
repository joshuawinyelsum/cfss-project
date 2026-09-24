import re

with open('frontend/src/app/dashboard/work/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Need Attention logic to strictly match 'failed'
content = content.replace("const localPending = localSurveys.filter(s => s.status !== 'DELETED' && (s.sync_status === 'pending' || s.sync_status === 'failed' || (s.status === 'SUBMITTED' && s.sync_status !== 'synced')));", 
                          "const localPending = localSurveys.filter(s => s.sync_status === 'failed');")

# Remove the header div and the outer container padding since layout handles it
content = content.replace('<div className="space-y-6 max-w-4xl mx-auto pb-12">', '<div>')
header = """      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Work</h1>
        <p className="text-sm text-muted mt-1">Your fieldwork in one place.</p>
      </div>"""
content = content.replace(header, '')

# Update links to point to the new nested routes
content = content.replace('href="/dashboard/surveys/drafts"', 'href="/dashboard/work/drafts"')
content = content.replace('href="/dashboard/surveys/submitted"', 'href="/dashboard/work/submitted"')
content = content.replace('href="/dashboard/sync"', 'href="/dashboard/work/attention"')

with open('frontend/src/app/dashboard/work/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated work/page.tsx")
