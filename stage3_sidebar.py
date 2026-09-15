with open('frontend/src/app/dashboard/layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace desktop sidebar background and text colors
# Old: <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 shrink-0 z-10">
content = content.replace('<aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 shrink-0 z-10">', 
                          '<aside className="hidden lg:flex flex-col w-64 bg-[#093C22] shrink-0 z-10">')

# Header in sidebar:
content = content.replace('<div className="p-6 flex items-center gap-3 border-b border-gray-100">', 
                          '<div className="p-6 flex items-center gap-3 border-b border-[#0c512e]">')

content = content.replace('<div className="w-10 h-10 bg-[#093C22] rounded-lg flex items-center justify-center shrink-0">\n            <span className="text-white font-bold text-xl">C</span>', 
                          '<div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0">\n            <span className="text-[#093C22] font-bold text-xl">C</span>')

content = content.replace('<h1 className="font-bold text-lg leading-tight text-gray-900">CFSS</h1>', 
                          '<h1 className="font-bold text-lg leading-tight text-white">CFSS</h1>')
content = content.replace('<p className="text-[10px] text-gray-500 leading-tight">Fieldwork Workspace</p>', 
                          '<p className="text-[10px] text-emerald-100/70 leading-tight">Fieldwork Workspace</p>')

# Navigation categories:
content = content.replace('<div className="text-xs font-semibold text-gray-400 mb-2 px-3 uppercase tracking-wider">Fieldwork</div>', 
                          '<div className="text-xs font-semibold text-emerald-100/50 mb-2 px-3 uppercase tracking-wider">Fieldwork</div>')
content = content.replace('<div className="text-xs font-semibold text-gray-400 mt-8 mb-2 px-3 uppercase tracking-wider">Account & System</div>', 
                          '<div className="text-xs font-semibold text-emerald-100/50 mt-8 mb-2 px-3 uppercase tracking-wider">Account & System</div>')

# Active / Inactive links in sidebar:
# The regex must be careful because we have primary and secondary nav items and mobile nav items.
# Desktop sidebar links use: `bg-[#093C22]/10 text-[#093C22]` and `text-gray-600 hover:bg-gray-100 hover:text-gray-900`
content = content.replace("? 'bg-[#093C22]/10 text-[#093C22]'", "? 'bg-white/10 text-white'")
content = content.replace(": 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'", ": 'text-emerald-100/70 hover:bg-white/5 hover:text-white'")

content = content.replace("? 'text-[#093C22]' : 'text-gray-400'", "? 'text-white' : 'text-emerald-100/70'")

# The badge in the sidebar:
content = content.replace('<span className="ml-auto bg-[#093C22] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">', 
                          '<span className="ml-auto bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">')

# Sync status box in sidebar:
content = content.replace('<div className="p-4 mt-auto border-t border-gray-100">', '<div className="p-4 mt-auto border-t border-[#0c512e]">')
content = content.replace('<div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">', '<div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">')
content = content.replace('<h3 className="text-sm font-medium text-gray-900 mb-2">Sync Status</h3>', '<h3 className="text-sm font-medium text-white mb-2">Sync Status</h3>')
content = content.replace('text-gray-600 mb-3', 'text-emerald-100/80 mb-3')
content = content.replace('<p className="text-[10px] text-gray-500 mb-3">', '<p className="text-[10px] text-emerald-100/50 mb-3">')
content = content.replace('bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700', 'bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-xs font-medium text-white')

# Logout button in sidebar:
content = content.replace('text-red-600 hover:bg-red-50', 'text-red-300 hover:bg-red-500/20 hover:text-red-200')


with open('frontend/src/app/dashboard/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Desktop sidebar styles updated")
