import re

with open('frontend/src/app/dashboard/sync/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r"const \[lastSyncText, setLastSyncText\] = useState\('Never'\);\s*const \[lastSyncText, setLastSyncText\] = useState\('Never'\);", "const [lastSyncText, setLastSyncText] = useState('Never');", content)

with open('frontend/src/app/dashboard/sync/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
