const fs = require('fs');
const content = \@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  /* Core Backgrounds */
  --color-page: #f9fafb;
  --color-surface: #ffffff;
  --color-surface-elevated: #ffffff;

  /* Core Borders */
  --color-border: #f3f4f6;
  --color-border-strong: #e5e7eb;

  /* Typography */
  --color-text-primary: #111827;
  --color-text-secondary: #4b5563;
  --color-text-muted: #9ca3af;

  /* Brand Colors */
  --color-cfss-green: #093C22;
  --color-cfss-green-hover: #0c512e;
  --color-cfss-green-soft: #f0fdf4;
  
  /* Semantic Status Colors */
  --color-status-success: #15803d;
  --color-status-warning: #b45309;
  --color-status-error: #b91c1c;
  --color-status-info: #1d4ed8;
}

@theme inline {
  --color-page: var(--color-page);
  --color-surface: var(--color-surface);
  --color-surface-elevated: var(--color-surface-elevated);
  --color-border: var(--color-border);
  --color-border-strong: var(--color-border-strong);
  
  --color-primary: var(--color-text-primary);
  --color-secondary: var(--color-text-secondary);
  --color-muted: var(--color-text-muted);
  
  --color-cfss-green: var(--color-cfss-green);
  --color-cfss-green-hover: var(--color-cfss-green-hover);
  --color-cfss-green-soft: var(--color-cfss-green-soft);
  
  --color-status-success: var(--color-status-success);
  --color-status-warning: var(--color-status-warning);
  --color-status-error: var(--color-status-error);
  --color-status-info: var(--color-status-info);

  --font-sans: Arial, Helvetica, sans-serif;
}

body {
  background-color: var(--color-page);
  color: var(--color-text-primary);
  font-family: Arial, Helvetica, sans-serif;
  -webkit-font-smoothing: antialiased;
}

input,
select,
textarea {
  color: var(--color-text-primary);
  background-color: var(--color-surface);
}

input::placeholder,
textarea::placeholder {
  color: var(--color-text-muted);
}
\;

fs.writeFileSync('frontend/src/app/globals.css', content);
