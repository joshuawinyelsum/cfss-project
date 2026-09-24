import re

with open('frontend/src/app/dashboard/map/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add LocalSurvey to imports
content = content.replace("import { db, LocalCommunity, LocalFeature } from '@/lib/db';", "import { db, LocalCommunity, LocalFeature, LocalSurvey } from '@/lib/db';")

# Add surveys state
content = content.replace("const [features, setFeatures] = useState<LocalFeature[]>([]);", "const [features, setFeatures] = useState<LocalFeature[]>([]);\n  const [surveys, setSurveys] = useState<LocalSurvey[]>([]);")

# Load surveys
content = content.replace("const localFeats = await db.features.where('community_id').equals(user.community_id!).toArray();", "const localFeats = await db.features.where('community_id').equals(user.community_id!).toArray();\n          const localSurveys = await db.surveys.where('student_id').equals(user.id as number).toArray();")

# Set surveys
content = content.replace("setFeatures(localFeats.filter(f => f.sync_status !== 'pending' || (f as unknown as { status: string }).status !== 'DELETED'));", "setFeatures(localFeats.filter(f => f.sync_status !== 'pending' || (f as unknown as { status: string }).status !== 'DELETED'));\n            setSurveys(localSurveys.filter(s => s.status !== 'DELETED'));")

# Pass surveys to StudentMap
content = content.replace("<StudentMap community={community} features={features} filterType={filterType} />", "<StudentMap community={community} features={features} filterType={filterType} surveys={surveys} />")

# Empty state text
content = content.replace("Spatial information for this community hasn't been collected yet.", "No field features collected yet. Go to Collect to start your fieldwork.")

with open('frontend/src/app/dashboard/map/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated MapPage")
