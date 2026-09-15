with open('tests/test_stabilization.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'assert reg_res.status_code == 201' in line:
        lines[i] = '        assert reg_res.status_code == 201, reg_res.json()\n'
    if 'async with test_engine.begin() as conn:' in line:
        # Delete my debug code
        lines[i-3:i+3] = []
        break
with open('tests/test_stabilization.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)
