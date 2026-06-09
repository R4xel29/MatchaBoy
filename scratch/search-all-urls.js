const fs = require('fs');

const filePath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\b202785a-176b-4f48-be75-ca50d974bd04\\.system_generated\\steps\\335\\content.md';
const content = fs.readFileSync(filePath, 'utf8');

const urlRegex = /https?:\/\/[a-zA-Z0-9\-\.\/]+/gi;
const matches = content.match(urlRegex) || [];
const uniqueMatches = Array.from(new Set(matches));

console.log('--- ALL DOKU DOMAINS ---');
uniqueMatches.forEach(url => {
  if (url.includes('doku.com')) {
    console.log(url);
  }
});
