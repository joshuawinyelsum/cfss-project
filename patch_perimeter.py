import sys

with open('frontend/src/components/StudentMap.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = 'Area: {areaStats.hectares} ha ({areaStats.sqKm} km'
pos = content.find(target)
if pos > -1:
    end_div = content.find('</div>', pos)
    replacement = '</div>\n              <div className="font-semibold text-gray-700">Perimeter: {areaStats.perimeterKm} km'
    content = content[:end_div] + replacement + content[end_div:]
    with open('frontend/src/components/StudentMap.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

