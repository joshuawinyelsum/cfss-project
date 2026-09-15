import re

files = [
    'frontend/src/app/dashboard/group/page.tsx',
    'frontend/src/app/dashboard/sync/page.tsx',
    'frontend/src/app/profile/page.tsx',
    'frontend/src/app/settings/page.tsx'
]

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Remove all "import Link from 'next/link';\n"
    content = content.replace("import Link from 'next/link';\n", "")
    
    # Put "use client"; at the absolute top
    if '"use client";' in content:
        content = content.replace('"use client";\n', '')
        content = '"use client";\n' + content
        
    # Put back Link
    content = content.replace('"use client";\n', '"use client";\nimport Link from \'next/link\';\n')
    
    # Remove ALL "ArrowLeft, " from everywhere inside imports
    content = content.replace("ArrowLeft, ", "")
    
    # Add ArrowLeft safely to the lucide-react import
    content = content.replace("} from 'lucide-react'", ", ArrowLeft } from 'lucide-react'")
    content = content.replace("ArrowLeft, ArrowLeft", "ArrowLeft")
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {file_path}")
