with open('frontend/src/app/dashboard/layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Isolate the mobile bottom nav part
start_idx = content.find('{/* Mobile Bottom Navigation */}')
if start_idx != -1:
    mobile_nav = content[start_idx:]
    mobile_nav = mobile_nav.replace("? 'text-white' : 'text-emerald-100/70'", "? 'text-[#093C22]' : 'text-gray-400'")
    mobile_nav = mobile_nav.replace("? 'text-white' : 'text-emerald-100/50'", "? 'text-[#093C22]' : 'text-gray-500'")
    
    # Check if there is another line for the text label
    mobile_nav = mobile_nav.replace("<span className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-emerald-100/50'}`}>", "<span className={`text-[10px] font-medium ${isActive ? 'text-[#093C22]' : 'text-gray-500'}`}>")

    content = content[:start_idx] + mobile_nav

with open('frontend/src/app/dashboard/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
