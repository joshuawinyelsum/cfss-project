import re

with open('frontend/src/app/dashboard/layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace main nav backgrounds
content = content.replace('bg-slate-900', 'bg-[#093C22]')
# We don't want to replace bg-slate-900/20 which is the overlay (it's fine to be dark blue-grey, or make it black/20). Let's fix that.
content = content.replace('bg-[#093C22]/20', 'bg-black/20')
# Replace border-slate-800 with border-[#0c512e] (a slightly lighter green)
content = content.replace('border-slate-800', 'border-[#0c512e]')
content = content.replace('border-slate-700', 'border-[#146b3e]')
content = content.replace('bg-slate-800', 'bg-[#0c512e]')

with open('frontend/src/app/dashboard/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
