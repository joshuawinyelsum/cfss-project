import re

with open('frontend/src/app/dashboard/sync/page.tsx', 'r', encoding='utf-8') as f:
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
content = content.replace('bg-emerald-700', 'bg-cfss-green')
content = content.replace('hover:bg-emerald-800', 'hover:bg-cfss-green-hover')
content = content.replace('text-emerald-700', 'text-cfss-green')
content = content.replace('text-emerald-600', 'text-cfss-green')
content = content.replace('bg-emerald-50', 'bg-cfss-green-soft')
content = content.replace('border-emerald-100', 'border-cfss-green/20')
content = content.replace('border-emerald-200', 'border-cfss-green/20')

# Status colors
content = content.replace('bg-amber-50 text-amber-700', 'bg-status-warning/10 text-status-warning')
content = content.replace('border-amber-200', 'border-status-warning/20')
content = content.replace('text-amber-600', 'text-status-warning')
content = content.replace('text-red-700', 'text-status-error')
content = content.replace('text-red-600', 'text-status-error')
content = content.replace('bg-red-50', 'bg-status-error/10')
content = content.replace('border-red-200', 'border-status-error/20')

# Flat layout logic
content = content.replace('rounded-xl shadow-sm border border-border flex flex-col', 'border-l-2 border-border pl-4 flex flex-col')
content = content.replace('bg-surface p-4 border-l-2 border-border pl-4 flex flex-col', 'flex flex-col border-l-2 border-border pl-4')
content = content.replace('bg-surface rounded-xl shadow-sm border border-border divide-y divide-border', 'flex flex-col border-t border-border mt-2')

# Fonts
content = content.replace('font-bold text-primary', 'font-light tracking-tight text-primary')
content = content.replace('text-2xl font-light tracking-tight text-primary', 'text-2xl font-light text-primary tracking-tight')

# Buttons
content = content.replace('rounded-xl sm:rounded-lg', 'rounded-lg')
content = content.replace('shadow-sm', '')

with open('frontend/src/app/dashboard/sync/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
