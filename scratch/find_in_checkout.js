const fs = require('fs');
const content = fs.readFileSync('src/app/(storefront)/checkout/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('matchaLevel')) {
        console.log(`Line ${index + 1}: ${line}`);
    }
});
