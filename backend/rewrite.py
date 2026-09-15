with open('tests/test_stabilization.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if 'from sqlalchemy.future import select' in line:
        skip = True
    if 'print("USERS IN DB BEFORE REGISTER:"' in line:
        skip = False
        continue
    if not skip:
        new_lines.append(line)

for i, line in enumerate(new_lines):
    if 'assert reg_res.status_code == 201' in line:
        new_lines[i] = '        assert reg_res.status_code == 201, reg_res.json()\n'

with open('tests/test_stabilization.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
