import os

admin_dir = 'frontend/src/app/admin'
for root, dirs, files in os.walk(admin_dir):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            content = content.replace("from \\'@/lib/store\\';", "from '@/lib/store';")
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
print('Done!')
