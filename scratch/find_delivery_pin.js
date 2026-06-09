const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
                results = results.concat(walk(fullPath));
            }
        } else {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walk(path.join(__dirname, '../src'));
files.forEach(file => {
    if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes('getDeliveryPin')) {
            console.log(`Found getDeliveryPin in: ${file}`);
            const lines = content.split('\n');
            lines.forEach((line, index) => {
                if (line.includes('getDeliveryPin')) {
                    console.log(`  Line ${index + 1}: ${line.trim()}`);
                }
            });
        }
    }
});
