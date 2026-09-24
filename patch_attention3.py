import re

with open('frontend/src/app/dashboard/work/attention/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Change the header text from 'Sync & Activity' to 'Need Attention'
content = content.replace('<h1 className="text-2xl font-bold text-primary">Sync & Activity</h1>', '<h2 className="text-xl font-bold text-primary">Need Attention</h2>')
content = content.replace('<p className="text-sm font-medium text-muted mt-1">Manage offline records and verify server synchronization.</p>', '<p className="text-sm font-medium text-muted mt-1">Review and resolve items that failed to synchronize.</p>')

# Remove back button block
content = re.sub(r'\{/\* Mobile Back Navigation \*/\}.*?</div>\s*</div>', '', content, flags=re.DOTALL)

# Safely remove pending and history sections
# The pending section starts with: {pendingItems.length > 0 && (
# and ends right before: {historyItems.length > 0 && (
content = re.sub(r'\{pendingItems\.length > 0 && \(.*?(?=\{historyItems\.length > 0 && \()', '', content, flags=re.DOTALL)

# The history section starts with: {historyItems.length > 0 && (
# and ends right before: {pendingItems.length === 0
content = re.sub(r'\{historyItems\.length > 0 && \(.*?(?=\{pendingItems\.length === 0)', '', content, flags=re.DOTALL)

# Update empty state
content = content.replace('{pendingItems.length === 0 && historyItems.length === 0 && failedItems.length === 0 && (', '{failedItems.length === 0 && (')
content = content.replace('<p className="text-muted font-medium text-sm">No activity recorded yet.</p>', '<p className="text-muted font-medium text-sm">No actionable items. You are all caught up!</p>')

with open('frontend/src/app/dashboard/work/attention/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated attention page correctly")
