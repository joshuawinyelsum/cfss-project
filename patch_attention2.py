import re

with open('frontend/src/app/dashboard/work/attention/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Change the header text from 'Sync & Activity' to 'Need Attention'
content = content.replace('<h1 className="text-2xl font-bold text-primary">Sync & Activity</h1>', '<h1 className="text-2xl font-bold text-primary">Need Attention</h1>')
content = content.replace('<p className="text-sm font-medium text-muted mt-1">Manage offline records and verify server synchronization.</p>', '<p className="text-sm font-medium text-muted mt-1">Review and resolve items that failed to synchronize.</p>')

# Remove the pendingItems section
content = re.sub(r'\{pendingItems\.length > 0 && \(.*?\)\}', '', content, flags=re.DOTALL)

# Remove the historyItems section
content = re.sub(r'\{historyItems\.length > 0 && \(.*?\)\}', '', content, flags=re.DOTALL)

# Update the empty state condition
content = content.replace('{pendingItems.length === 0 && historyItems.length === 0 && failedItems.length === 0 && (', '{failedItems.length === 0 && (')
content = content.replace('<p className="text-muted font-medium text-sm">No activity recorded yet.</p>', '<p className="text-muted font-medium text-sm">No actionable items. You are all caught up!</p>')

with open('frontend/src/app/dashboard/work/attention/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated attention page")
