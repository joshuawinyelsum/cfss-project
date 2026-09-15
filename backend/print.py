with open('test_stabilization.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'assert reg_res.status_code == 201' in line:
        lines.insert(i, '        if reg_res.status_code != 201:\n            print("REG ERROR:", reg_res.json())\n')
        break
with open('test_stabilization.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)
