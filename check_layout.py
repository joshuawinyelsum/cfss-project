import re

with open('C:/Users/ADMIN/Workspace/Projects/origin_main/frontend/src/app/dashboard/layout.tsx', 'r', encoding='utf-8') as f:
    orig = f.read()

with open('frontend/src/app/dashboard/layout.tsx', 'r', encoding='utf-8') as f:
    curr = f.read()

# Current logic starts from xport default function until the if (!hydrated... return, then eturn (
# Let's extract everything inside the component BEFORE eturn ( from CURRENT
curr_logic = re.search(r'(export default function DashboardLayout[\s\S]*?)  return \(', curr).group(1)

# Extract everything from eturn ( to the end from ORIG
orig_render = re.search(r'  return \([\s\S]+', orig).group(0)

# But wait! The orig_render references variables!
# Let's see what variables orig_render uses.
