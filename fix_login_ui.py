import re

with open('C:/Users/ADMIN/Workspace/Projects/origin_main/frontend/src/app/login/page.tsx', 'r', encoding='utf-8') as f:
    orig = f.read()

with open('frontend/src/app/login/page.tsx', 'r', encoding='utf-8') as f:
    curr = f.read()

# Extract the return statement block from orig
orig_return = re.search(r'  return \([\s\S]+\);', orig).group(0)

# Replace the return block in curr with orig
curr = re.sub(r'  return \([\s\S]+\);', orig_return, curr)

with open('frontend/src/app/login/page.tsx', 'w', encoding='utf-8') as f:
    f.write(curr)
print('login/page.tsx fixed')
