const fs = require('fs');

const file = 'src/app/globals.css';
let content = fs.readFileSync(file, 'utf8');

// replace :root with dark variables
content = content.replace(':root {', 
`:root {
  /* Premium Light Mode Color System */
  --bg-base: #f9fafb;
  --bg-surface: rgba(255, 255, 255, 0.8);
  --bg-elevated: rgba(243, 244, 246, 0.7);
  --border: rgba(0, 0, 0, 0.08);
  --border-focus: rgba(99, 102, 241, 0.4);
  --border-default: rgba(0, 0, 0, 0.05);

  --text-primary: #111827;
  --text-secondary: #4b5563;
  --text-tertiary: #6b7280;
  --text-muted: #9ca3af;

  --accent: #6366f1;
  --accent-dim: rgba(99, 102, 241, 0.1);
  --accent-primary: #4f46e5;
  --accent-secondary: #0891b2;
  --accent-secondary-dim: rgba(8, 145, 178, 0.1);

  --success: #10B981;
  --warning: #F59E0B;
  --danger: #EF4444;

  --sql-keyword: #a626a4;
  --sql-string: #50a14f;
  --sql-number: #986801;
  --sql-table: #4078f2;

  --font-main: 'Satoshi', system-ui, -apple-system, sans-serif;
  --font-ui:   'Satoshi', system-ui, -apple-system, sans-serif;
  --font-mono: var(--font-geist-mono), 'Fira Code', ui-monospace, monospace;

  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-smooth: 300ms cubic-bezier(0.25, 1, 0.5, 1);
  --transition-bounce: 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dark {
  /* Premium Dark Mode Color System */
  --bg-base: #080a12;
  --bg-surface: rgba(13, 15, 26, 0.8);
  --bg-elevated: rgba(22, 24, 32, 0.7);
  --border: rgba(255, 255, 255, 0.08);
  --border-focus: rgba(99, 102, 241, 0.4);
  --border-default: rgba(255, 255, 255, 0.05);

  --text-primary: #FAFAFB;
  --text-secondary: #A1A1AA;
  --text-tertiary: #71717A;
  --text-muted: #52525B;

  --accent: #6366f1;
  --accent-dim: rgba(99, 102, 241, 0.1);
  --accent-primary: #6366f1;
  --accent-secondary: #06b6d4;
  --accent-secondary-dim: rgba(6, 182, 212, 0.1);

  --success: #10B981;
  --warning: #F59E0B;
  --danger: #EF4444;

  --sql-keyword: #c678dd;
  --sql-string: #98c379;
  --sql-number: #d19a66;
  --sql-table: #61afef;
`);

// Delete old dark mode variables in :root
const oldVars = `  /* Premium Dark Mode Color System */
  --bg-base: #080a12;
  --bg-surface: rgba(13, 15, 26, 0.8);
  --bg-elevated: rgba(22, 24, 32, 0.7);
  --border: rgba(255, 255, 255, 0.08);
  --border-focus: rgba(99, 102, 241, 0.4);
  /* Indigo focus */
  --border-default: rgba(255, 255, 255, 0.05);

  --text-primary: #FAFAFB;
  --text-secondary: #A1A1AA;
  --text-tertiary: #71717A;
  --text-muted: #52525B;

  /* Accents */
  --accent: #6366f1;
  /* Vibrant Indigo */
  --accent-dim: rgba(99, 102, 241, 0.1);
  --accent-primary: #6366f1;
  --accent-secondary: #06b6d4;
  /* Vibrant Cyan */
  --accent-secondary-dim: rgba(6, 182, 212, 0.1);

  --success: #10B981;
  --warning: #F59E0B;
  --danger: #EF4444;

  /* SQL Syntax Highlighting - Sleek Dark Pro */
  --sql-keyword: #c678dd;
  --sql-string: #98c379;
  --sql-number: #d19a66;
  --sql-table: #61afef;

  /* Typography — Satoshi as primary UI font */
  --font-main: 'Satoshi', system-ui, -apple-system, sans-serif;
  --font-ui:   'Satoshi', system-ui, -apple-system, sans-serif;
  --font-mono: var(--font-geist-mono), 'Fira Code', ui-monospace, monospace;

  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-smooth: 300ms cubic-bezier(0.25, 1, 0.5, 1);
  --transition-bounce: 400ms cubic-bezier(0.34, 1.56, 0.64, 1);`;
content = content.replace(oldVars, '');

fs.writeFileSync(file, content);
