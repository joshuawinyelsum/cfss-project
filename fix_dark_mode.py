with open('frontend/src/app/globals.css', 'r', encoding='utf-8') as f:
    content = f.read()

dark_vars = """
.dark {
  /* Core Backgrounds */
  --color-page: #111827;
  --color-surface: #1f2937;
  --color-surface-elevated: #374151;

  /* Core Borders */
  --color-border-subtle: #374151;
  --color-border-strong: #4b5563;

  /* Typography */
  --color-text-primary: #f9fafb;
  --color-text-secondary: #d1d5db;
  --color-text-muted: #9ca3af;

  /* Brand Colors */
  --color-cfss-green: #0d5c34;
  --color-cfss-green-hover: #107542;
  --color-cfss-green-soft: rgba(13, 92, 52, 0.15);
  
  /* Semantic Status Colors */
  --color-status-success: #22c55e;
  --color-status-warning: #f59e0b;
  --color-status-error: #ef4444;
  --color-status-info: #3b82f6;
}
"""

if ".dark {" not in content:
    content = content.replace("@theme inline {", dark_vars + "\n@theme inline {")
    with open('frontend/src/app/globals.css', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added dark mode variables")
else:
    print("Dark mode variables already exist")
