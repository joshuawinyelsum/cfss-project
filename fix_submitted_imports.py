with open('frontend/src/app/dashboard/surveys/submitted/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("Search, Filter, Loader2, ArrowRight", "Search, Filter, Loader2, ArrowRight, Cloud, RefreshCw")

with open('frontend/src/app/dashboard/surveys/submitted/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
