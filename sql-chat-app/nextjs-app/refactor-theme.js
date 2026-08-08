const fs = require('fs');

const file = 'src/app/dashboard/query-studio/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// The file relies heavily on style={{}} props. Let's add className to the main wrappers.
content = content.replace(/style=\{\{ flex: 1, display: "flex", flexDirection: "column", background: "var\(--bg-base\)" \}\}/,
    'className="flex-1 flex flex-col bg-gray-50 dark:bg-[#080a12]"');

content = content.replace(/style=\{\{\s*display: "flex", flex: 1, overflow: "hidden",\s*\}\}/,
    'className="flex flex-1 overflow-hidden"');

// Left Sidebar
content = content.replace(/style=\{\{\s*width: "300px",\s*borderRight: "1px solid rgba\(255,255,255,0.06\)",\s*background: "rgba\(13,15,26,0.5\)",\s*display: "flex",\s*flexDirection: "column",\s*flexShrink: 0,\s*\}\}/,
    'className="w-[300px] border-r border-gray-200 dark:border-white/5 bg-white/50 dark:bg-[#0d0f1a]/50 flex flex-col shrink-0"');

// Header in Left Sidebar
content = content.replace(/style=\{\{ padding: "20px", borderBottom: "1px solid rgba\(255,255,255,0.06\)" \}\}/,
    'className="p-5 border-b border-gray-200 dark:border-white/5"');

// Right Content
content = content.replace(/style=\{\{ flex: 1, display: "flex", flexDirection: "column", background: "rgba\(8,10,18,0.3\)" \}\}/,
    'className="flex-1 flex flex-col bg-gray-50/50 dark:bg-[#080a12]/30"');

fs.writeFileSync(file, content);
