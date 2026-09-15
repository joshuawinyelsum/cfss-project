import re

with open('frontend/src/app/login/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Reverse UI redesign tokens
content = content.replace('bg-surface', 'bg-white')
content = content.replace('bg-page', 'bg-gray-50')
content = content.replace('border-border-strong', 'border-gray-300')
content = content.replace('border-border', 'border-gray-200')
content = content.replace('text-primary', 'text-gray-900')
content = content.replace('text-secondary', 'text-gray-700')
content = content.replace('text-muted', 'text-gray-500')
content = content.replace('bg-cfss-green-hover', 'bg-blue-700')
content = content.replace('text-cfss-green', 'text-blue-600')
content = content.replace('bg-cfss-green', 'bg-blue-600')
content = content.replace('border-cfss-green/20', 'border-emerald-200')
content = content.replace('bg-status-success/10 text-status-success', 'bg-green-50 text-green-700')
content = content.replace('border-status-success/20', 'border-green-200')
content = content.replace('bg-status-error/10 text-status-error', 'bg-red-50 text-red-700')
content = content.replace('border-status-error/20', 'border-red-200')

with open('frontend/src/app/login/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("login/page.tsx UI tokens replaced safely")
