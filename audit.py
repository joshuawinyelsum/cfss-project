import os
import re

def audit_directory(dir_path):
    issues = []
    
    anti_patterns = {
        "gradient": re.compile(r'bg-gradient-to|from-purple|to-blue|text-transparent|bg-clip-text'),
        "glassmorphism": re.compile(r'backdrop-blur|bg-white/|bg-black/'),
        "emoji": re.compile(r'[\U00010000-\U0010ffff]'),
        "colored-left-border": re.compile(r'border-l-4 border-\w+-500'),
        "three-boxes": re.compile(r'grid-cols-3'),
        "lucide-everywhere": re.compile(r'<[A-Z][a-zA-Z]+Icon'),
        "fixed-height": re.compile(r' h-64 | h-96 | h-\[.*?\]'),
    }

    for root, dirs, files in os.walk(dir_path):
        for file in files:
            if file.endswith('.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                for name, regex in anti_patterns.items():
                    matches = regex.findall(content)
                    if matches:
                        issues.append(f"{path}: Found {name} ({len(matches)} times)")
                        
    return issues

print("\n".join(audit_directory('frontend/src/app')))
