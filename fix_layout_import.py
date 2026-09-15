with open('frontend/src/app/dashboard/layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_statement = """import { 
  Home, 
  FileEdit, 
  CheckSquare, 
  User as UserIcon, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Users, 
  BarChart2,
  ClipboardList,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';"""

# replace any existing lucide-react import
import re
content = re.sub(r"import\s+\{.*?} from 'lucide-react';", import_statement, content, flags=re.DOTALL)

with open('frontend/src/app/dashboard/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
