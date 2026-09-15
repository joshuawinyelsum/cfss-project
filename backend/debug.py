with open('tests/test_stabilization.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'reg_res = await client.post(' in line:
        lines.insert(i, '''
        from sqlalchemy.future import select
        from app import models
        async with test_engine.begin() as conn:
            from sqlalchemy import text
            res = await conn.execute(text("SELECT id, student_id FROM users"))
            print("USERS IN DB BEFORE REGISTER:", res.fetchall())
''')
        break
with open('tests/test_stabilization.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)
