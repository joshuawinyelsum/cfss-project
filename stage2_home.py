import re

with open('frontend/src/app/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the Primary Call to Action block
start_idx = content.find('          {/* Primary Call to Action */}')
end_idx = content.find('          {/* Main Grid */}')

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]
    with open('frontend/src/app/dashboard/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Primary Call to Action removed from Home page")
else:
    print("Could not find Primary Call to Action section")
