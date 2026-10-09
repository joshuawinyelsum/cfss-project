content = open('frontend/src/app/dashboard/map/page.tsx', 'r').read()
content = content.replace("Authorization: `Bearer ${token}`\\ }", "Authorization: `Bearer ${token}` }")
open('frontend/src/app/dashboard/map/page.tsx', 'w').write(content)
