import re

with open('frontend/src/app/dashboard/surveys/submitted/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "const allLocal = await db.surveys.where('status').equals('SUBMITTED').toArray();\n      // Simple local filtering\n      let localSubmitted = allLocal.filter(d => d.student_id === user?.id);",
    "const userSurveys = await db.surveys.where('student_id').equals(user?.id as number).toArray();\n      const allLocal = userSurveys.filter(s => s.status === 'SUBMITTED');\n      let localSubmitted = allLocal;"
)

with open('frontend/src/app/dashboard/surveys/submitted/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("submitted fixed")
