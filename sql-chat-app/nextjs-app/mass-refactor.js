const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('src/app/dashboard');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Hardcoded background colors -> tailwind
    if (content.includes('background: "#080a12"')) {
        content = content.replace(/background: "#080a12"/g, 'background: "var(--bg-base)"');
        changed = true;
    }
    if (content.includes('background: "rgba(13,15,26,0.5)"')) {
        content = content.replace(/background: "rgba\(13,15,26,0.5\)"/g, 'background: "var(--bg-surface)"');
        changed = true;
    }
    if (content.includes('color: "#fff"')) {
        content = content.replace(/color: "#fff"/g, 'color: "var(--text-primary)"');
        changed = true;
    }
    if (content.includes('color: "#9CA3AF"')) {
        content = content.replace(/color: "#9CA3AF"/g, 'color: "var(--text-secondary)"');
        changed = true;
    }
    if (content.includes('border: "1px solid rgba(255,255,255,0.08)"')) {
        content = content.replace(/border: "1px solid rgba\(255,255,255,0.08\)"/g, 'border: "1px solid var(--border)"');
        changed = true;
    }
    if (content.includes('borderBottom: "1px solid rgba(255,255,255,0.08)"')) {
        content = content.replace(/borderBottom: "1px solid rgba\(255,255,255,0.08\)"/g, 'borderBottom: "1px solid var(--border)"');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content);
    }
});
