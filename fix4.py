import sys
content = open('frontend/src/app/dashboard/map/page.tsx', 'r').read()
content = content.replace('className={\\   ext-xs', 'className={`text-xs')
content = content.replace('className={\\   ', 'className={`')
content = content.replace('transition-colors \\\\}', "transition-colors ${editMode ? 'bg-[#093C22] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}")
content = content.replace('transition-colors \\}', "transition-colors ${editMode ? 'bg-[#093C22] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}")
open('frontend/src/app/dashboard/map/page.tsx', 'w').write(content)

