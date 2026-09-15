with open('tests/test_stabilization.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '# 2. Register the student' in line:
        lines.insert(i, '''
        # 1c. Create a community
        await client.post(
            "/api/admin/communities",
            json={
                "name": "Test Comm",
                "district": "D",
                "region": "R",
                "capacity": 10,
                "group_number": 1
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
''')
        break
with open('tests/test_stabilization.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)
