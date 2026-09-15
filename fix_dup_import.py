with open('frontend/src/app/dashboard/layout.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
found_format_distance = False
for line in lines:
    if "import { formatDistanceToNow } from 'date-fns';" in line:
        if found_format_distance:
            continue
        found_format_distance = True
    new_lines.append(line)

with open('frontend/src/app/dashboard/layout.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
