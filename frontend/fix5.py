import sys
with open('src/components/StudentMap.tsx', 'r') as f:
    content = f.read()

content = content.replace('html: \<div style="', 'html: `<div style="')
content = content.replace('background-color: \;', 'background-color: ${color};')
content = content.replace('opacity: \;', 'opacity: ${opacity};')
content = content.replace('"></div>\,', '"></div>`,')
content = content.replace('setLocationError(\Location error: \\\\);', 'setLocationError(`Location error: ${e.message}`);')
content = content.replace('pdf.save(\\_map.pdf\);', 'pdf.save(`${communityId || "community"}_map.pdf`);')
content = content.replace('link.download = \\_map.\\;', 'link.download = `${communityId || "community"}_map.${format}`;')

with open('src/components/StudentMap.tsx', 'w') as f:
    f.write(content)

