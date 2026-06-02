const fs = require('fs');
const content = fs.readFileSync('src/app/(storefront)/checkout/page.tsx', 'utf8');
const lines = content.split('\n');
let indices = [];
lines.forEach((line, index) => {
    if (line.includes("fetch('/api/checkout'") || line.includes('fetch("/api/checkout"')) {
        indices.push(index);
    }
});
indices.forEach(start => {
    console.log(`--- Match at line ${start+1} ---`);
    console.log(lines.slice(Math.max(0, start - 15), Math.min(lines.length, start + 30)).join('\n'));
});
