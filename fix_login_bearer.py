with open('frontend/src/app/login/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("Authorization: Bearer  + token", "Authorization: 'Bearer ' + token")

with open('frontend/src/app/login/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
