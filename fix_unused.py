with open('frontend/src/app/dashboard/layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);", "")

with open('frontend/src/app/dashboard/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
