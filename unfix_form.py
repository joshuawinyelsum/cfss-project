import re

with open('frontend/src/app/surveys/[type]/fill/[id]/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Reverse replace background and border tokens
content = content.replace('bg-surface', 'bg-white')
content = content.replace('bg-page', 'bg-gray-50')
content = content.replace('border-border-strong', 'border-gray-300')
content = content.replace('border-border', 'border-gray-200') # This might undo border-gray-100 to 200, which is fine

# Reverse Replace text colors
content = content.replace('text-primary', 'text-gray-900')
content = content.replace('text-secondary', 'text-gray-700')
content = content.replace('text-muted', 'text-gray-500')

# Reverse Replace brand colors
content = content.replace('bg-cfss-green-hover', 'bg-emerald-700')
content = content.replace('bg-cfss-green-soft', 'bg-emerald-50')
content = content.replace('text-cfss-green', 'text-emerald-600')
content = content.replace('bg-cfss-green', 'bg-emerald-600')
content = content.replace('border-cfss-green/20', 'border-emerald-200')
content = content.replace('focus:ring-cfss-green', 'focus:ring-emerald-500')
content = content.replace('focus:border-cfss-green', 'focus:border-emerald-500')

# Status colors
content = content.replace('bg-status-warning/10 text-status-warning', 'bg-amber-50 text-amber-700')
content = content.replace('border-status-warning/20', 'border-amber-200')
content = content.replace('bg-status-error/10 text-status-error', 'bg-red-50 text-red-600')
content = content.replace('border-status-error/20', 'border-red-100')

# Adjust layout roundness and shadows to be flat
content = content.replace('border-y sm:border sm:rounded-lg border-gray-200', 'rounded-xl shadow-sm border border-gray-200')
content = content.replace('rounded-lg border-red-100', 'rounded-xl border border-red-100')

# Fixed bottom bar
content = content.replace('fixed bottom-0 left-0 lg:left-64 right-0 bg-white border-t border-gray-200 p-4 z-10', 'fixed bottom-0 left-0 lg:left-64 right-0 bg-white border-t border-gray-200 p-4 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]')

# Bottom buttons
content = content.replace('rounded-lg hover:bg-gray-50', 'rounded-xl hover:bg-gray-50')
content = content.replace('rounded-lg hover:bg-emerald-700', 'rounded-xl hover:bg-emerald-700')

with open('frontend/src/app/surveys/[type]/fill/[id]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('fill page styling reverted')
