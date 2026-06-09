const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/api/webhooks/whatsapp/route.ts');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, index) => {
    if (line.includes('buttons')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
