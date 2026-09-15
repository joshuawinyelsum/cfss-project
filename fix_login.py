import re

with open('frontend/src/app/login/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace background and border tokens
content = content.replace('bg-white', 'bg-surface')
content = content.replace('bg-gray-50', 'bg-page')
content = content.replace('border-gray-200', 'border-border')
content = content.replace('border-gray-100', 'border-border')
content = content.replace('border-gray-300', 'border-border-strong')

# Replace text colors
content = content.replace('text-gray-900', 'text-primary')
content = content.replace('text-gray-700', 'text-secondary')
content = content.replace('text-gray-600', 'text-secondary')
content = content.replace('text-gray-500', 'text-muted')
content = content.replace('text-gray-400', 'text-muted')

# Replace brand colors
content = content.replace('bg-blue-600', 'bg-cfss-green')
content = content.replace('hover:bg-blue-700', 'hover:bg-cfss-green-hover')
content = content.replace('text-blue-600', 'text-cfss-green')

# Status colors
content = content.replace('bg-green-50 text-green-700', 'bg-status-success/10 text-status-success')
content = content.replace('border-green-200', 'border-status-success/20')
content = content.replace('text-red-700', 'text-status-error')
content = content.replace('bg-red-50', 'bg-status-error/10')
content = content.replace('border-red-200', 'border-status-error/20')

# Font adjustments for minimal look
content = content.replace('font-semibold text-primary', 'font-light tracking-tight text-primary')

with open('frontend/src/app/login/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
