import re

with open('frontend/src/app/surveys/[type]/fill/[id]/page.tsx', 'r', encoding='utf-8') as f:
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

# Replace brand colors
content = content.replace('bg-emerald-600', 'bg-cfss-green')
content = content.replace('bg-emerald-500', 'bg-cfss-green')
content = content.replace('bg-emerald-700', 'bg-cfss-green-hover')
content = content.replace('text-emerald-700', 'text-cfss-green')
content = content.replace('text-emerald-600', 'text-cfss-green')
content = content.replace('text-emerald-500', 'text-cfss-green')
content = content.replace('bg-emerald-50', 'bg-cfss-green-soft')
content = content.replace('border-emerald-200', 'border-cfss-green/20')
content = content.replace('border-emerald-100', 'border-cfss-green/20')
content = content.replace('focus:ring-emerald-500', 'focus:ring-cfss-green')
content = content.replace('focus:border-emerald-500', 'focus:border-cfss-green')

# Status colors
content = content.replace('bg-amber-50 text-amber-700', 'bg-status-warning/10 text-status-warning')
content = content.replace('border-amber-200', 'border-status-warning/20')

# Adjust layout roundness and shadows to be flat
content = content.replace('rounded-xl shadow-sm border border-border', 'border-y sm:border sm:rounded-lg border-border')
content = content.replace('rounded-xl border border-red-100', 'rounded-lg border-status-error/20')
content = content.replace('bg-red-50 text-red-600', 'bg-status-error/10 text-status-error')

# Fixed bottom bar
content = content.replace('fixed bottom-0 left-0 lg:left-64 right-0 bg-surface border-t border-border p-4 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]', 'fixed bottom-0 left-0 lg:left-64 right-0 bg-surface border-t border-border p-4 z-10')

# Bottom buttons
content = content.replace('rounded-xl hover:bg-page', 'rounded-lg hover:bg-page')
content = content.replace('rounded-xl hover:bg-cfss-green-hover', 'rounded-lg hover:bg-cfss-green-hover')

with open('frontend/src/app/surveys/[type]/fill/[id]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
