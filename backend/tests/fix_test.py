with open('test_stabilization.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    
# Find the line with test_student_profile_fields
for i, line in enumerate(lines):
    if 'def test_student_profile_fields' in line:
        lines[i] = '    async def test_student_profile_fields(self, client: AsyncClient, admin_token: str):\n'
    if '# 2. Register the student' in line:
        insert_idx = i
        break

lines.insert(insert_idx, '''
        # 1b. Open registration
        await client.post(
            "/admin/settings",
            json={
                "registration_open": True,
                "admin_password": "admin",
                "max_students_per_community": 10,
                "auto_assign_enabled": True,
                "assignment_strategy": "balanced",
                "survey_enabled": False,
                "allow_multiple_submissions": False,
                "default_page_size": 100
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
''')

with open('test_stabilization.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)
