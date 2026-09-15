import re

with open('frontend/src/app/dashboard/sync/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find duplicate import
content = re.sub(r"import \{ formatDistanceToNow \} from 'date-fns';\s*import \{ formatDistanceToNow \} from 'date-fns';", "import { formatDistanceToNow } from 'date-fns';", content)

with open('frontend/src/app/dashboard/sync/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
