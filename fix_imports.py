import re

with open('frontend/src/app/dashboard/sync/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("useState, useCallback, useCallback", "useState, useCallback")

with open('frontend/src/app/dashboard/sync/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
