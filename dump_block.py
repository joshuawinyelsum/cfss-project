with open('frontend/src/app/dashboard/layout.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start = -1
for i, line in enumerate(lines):
    if "user.role === 'admin'" in line:
        start = i - 1
        break

if start != -1:
    print(''.join(lines[start:start+15]))
