import os
import re

files_to_fix = [
    'frontend/src/app/dashboard/work/page.tsx',
    'frontend/src/app/dashboard/sync/page.tsx',
    'frontend/src/app/dashboard/surveys/drafts/page.tsx',
    'frontend/src/app/dashboard/surveys/submitted/page.tsx',
    'frontend/src/app/dashboard/page.tsx',
    'frontend/src/app/dashboard/layout.tsx',
    'frontend/src/app/surveys/page.tsx'
]

replacements = {
    'bg-white': 'bg-surface',
    'text-gray-900': 'text-primary',
    'text-gray-800': 'text-primary',
    'text-gray-700': 'text-secondary',
    'text-gray-600': 'text-secondary',
    'text-gray-500': 'text-muted',
    'text-gray-400': 'text-muted',
    'bg-gray-50': 'bg-page',
    'bg-gray-100': 'bg-page',
    'border-gray-200': 'border-border-strong',
    'border-gray-100': 'border-border',
    'border-gray-300': 'border-border-strong',
    'divide-gray-100': 'divide-border',
    'divide-gray-200': 'divide-border-strong'
}

for file_path in files_to_fix:
    if not os.path.exists(file_path):
        continue
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    for old, new in replacements.items():
        # Only replace word bounded classes inside className
        content = re.sub(r'\b' + old + r'\b', new, content)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed colors in {file_path}")
