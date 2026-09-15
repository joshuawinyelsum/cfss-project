with open('frontend/src/app/dashboard/surveys/submitted/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("        </div>\n\n      </div>\n    </>\n  );\n}", "      </div>\n    </>\n  );\n}")

with open('frontend/src/app/dashboard/surveys/submitted/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
