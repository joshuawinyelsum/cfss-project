import re

with open('frontend/src/components/StudentMap.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'<div className="text-xs text-gray-400 mt-1">Group \{community\.group_number\}</div>', '', content)

with open('frontend/src/components/StudentMap.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed group_number from StudentMap")
