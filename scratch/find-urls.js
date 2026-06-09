const fs = require('fs');

const filePath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\b202785a-176b-4f48-be75-ca50d974bd04\\.system_generated\\steps\\313\\content.md';
const content = fs.readFileSync(filePath, 'utf8');

// Find all URLs starting with http or https
const urlRegex = /https?:\/\/[a-zA-Z0-9\-\.\/\_]+/gi;
const urls = content.match(urlRegex) || [];
const uniqueUrls = Array.from(new Set(urls));

console.log('--- DOKU URLS FOUND ---');
uniqueUrls.forEach(url => {
  if (url.includes('api.doku') || url.includes('api-sandbox.doku') || url.includes('mcp')) {
    console.log(url);
  }
});
