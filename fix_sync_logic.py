import re

with open('frontend/src/app/dashboard/sync/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add formatDistanceToNow
content = content.replace(
    "import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';",
    "import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';\nimport { formatDistanceToNow } from 'date-fns';"
)

content = content.replace("useEffect, useState", "useEffect, useState, useCallback")

content = content.replace("const [isOnline, setIsOnline] = useState(true);", "const [isOnline, setIsOnline] = useState(true);\n  const [lastSyncText, setLastSyncText] = useState('Never');")

content = content.replace("const loadSyncData = async () => {", "const loadSyncData = useCallback(async () => {")

content = content.replace(
    "const all = await db.surveys.toArray();\n      \n      const pending = all.filter(s => s.sync_status === 'pending' || s.sync_status === 'syncing');\n      const failed = all.filter(s => s.sync_status === 'failed');\n      const synced = all.filter(s => s.sync_status === 'synced');\n      \n      setStats({\n        total: all.length,",
    "const mySurveys = await db.surveys.where('student_id').equals(user?.id as number).toArray();\n      \n      const pending = mySurveys.filter(s => s.sync_status === 'pending' || s.sync_status === 'syncing');\n      const failed = mySurveys.filter(s => s.sync_status === 'failed');\n      const synced = mySurveys.filter(s => s.sync_status === 'synced');\n      \n      setStats({\n        total: mySurveys.length,"
)

content = content.replace(
    "// Sort newest first\n      setPendingItems([...pending, ...failed].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));\n      setHistoryItems(synced.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 50));\n      setIsOnline(navigator.onLine);",
    "setPendingItems([...pending, ...failed].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));\n      setHistoryItems(synced.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 20));\n      setIsOnline(navigator.onLine);\n      \n      const stored = localStorage.getItem('cfss_last_sync');\n      if (stored) {\n        setLastSyncText(formatDistanceToNow(new Date(stored), { addSuffix: true }));\n      }"
)

content = content.replace(
    "  };\n\n  useEffect(() => {",
    "  }, [user]);\n\n  useEffect(() => {"
)

content = content.replace(
    "window.addEventListener('sync-completed', loadSyncData);\n    window.addEventListener('sync-queued', loadSyncData);\n    window.addEventListener('online', loadSyncData);\n    window.addEventListener('offline', loadSyncData);\n    \n    // Periodically update to catch background changes just in case\n    const interval = setInterval(loadSyncData, 5000);\n    \n    return () => {\n      window.removeEventListener('sync-completed', loadSyncData);\n      window.removeEventListener('sync-queued', loadSyncData);\n      window.removeEventListener('online', loadSyncData);\n      window.removeEventListener('offline', loadSyncData);\n      clearInterval(interval);\n    };\n  }, [user, token, router]);",
    "const handleSync = () => loadSyncData();\n    window.addEventListener('sync-completed', handleSync);\n    window.addEventListener('sync-queued', handleSync);\n    window.addEventListener('online', handleSync);\n    window.addEventListener('offline', handleSync);\n    \n    const interval = setInterval(loadSyncData, 30000);\n    \n    return () => {\n      window.removeEventListener('sync-completed', handleSync);\n      window.removeEventListener('sync-queued', handleSync);\n      window.removeEventListener('online', handleSync);\n      window.removeEventListener('offline', handleSync);\n      clearInterval(interval);\n    };\n  }, [user, token, router, loadSyncData]);"
)

with open('frontend/src/app/dashboard/sync/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("sync fixed")
