const fs = require('fs');
const docPath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\58830622-cc2d-4fe6-b7b3-46249232146a\\.system_generated\\steps\\56\\content.md';
const content = fs.readFileSync(docPath, 'utf8');

const regex = /https?:\/\/[^\s"'<>]+/g;
const urls = content.match(regex) || [];
const uniqueUrls = Array.from(new Set(urls));

console.log("Found unique URLs:");
uniqueUrls.forEach(url => {
  if (url.includes('doku') && (url.includes('mcp') || url.includes('api'))) {
    console.log(url);
  }
});
