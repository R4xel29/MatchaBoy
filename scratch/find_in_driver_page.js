const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/(driver)/driver/page.tsx');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

const keywords = ['map', 'lat', 'lng', 'address', 'google', 'coordinate', 'location'];
lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();
    const matches = keywords.filter(kw => lowerLine.includes(kw));
    if (matches.length > 0) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
