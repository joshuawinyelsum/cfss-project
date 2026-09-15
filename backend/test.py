with open('tests/test_stabilization.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '# 2. Register the student' in line:
        lines.insert(i, '        assert set_res.status_code == 200, set_res.json()\n')
        break
    if 'await client.put(' in line:
        lines[i] = line.replace('await client.put(', 'set_res = await client.put(')
        
with open('tests/test_stabilization.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)
