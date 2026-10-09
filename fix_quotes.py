import sys

def fix_map_page():
    content = open('frontend/src/app/dashboard/map/page.tsx', 'r').read()
    content = content.replace("Authorization: \\Bearer \\", "Authorization: `Bearer ${token}`")
    open('frontend/src/app/dashboard/map/page.tsx', 'w').write(content)

def fix_student_map():
    content = open('frontend/src/components/StudentMap.tsx', 'r').read()
    content = content.replace("\\`<div", "`<div").replace("</div>\\`", "</div>`")
    content = content.replace("\\${color}", "${color}").replace("\\${opacity}", "${opacity}")
    content = content.replace("\\`Location error: \\${error.message}\\`", "`Location error: ${error.message}`")
    content = content.replace("\\`\\${community.name}_map.pdf\\`", "`${community.name}_map.pdf`")
    content = content.replace("\\`\\${community.name}_map.\\${format}\\`", "`${community.name}_map.${format}`")
    open('frontend/src/components/StudentMap.tsx', 'w').write(content)

fix_map_page()
fix_student_map()
