import os
import re

admin_dir = 'frontend/src/app/admin'
for root, dirs, files in os.walk(admin_dir):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Replace import
            content = re.sub(r'import { useAuthStore } from \'@/lib/store\';', r'import { useAdminAuthStore } from \'@/lib/store\';', content)
            
            # Replace usage
            content = content.replace('useAuthStore', 'useAdminAuthStore')
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
print('Done!')
