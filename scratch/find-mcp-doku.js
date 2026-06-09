const fs = require('fs');

const filePath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\b202785a-176b-4f48-be75-ca50d974bd04\\.system_generated\\steps\\335\\content.md';
const content = fs.readFileSync(filePath, 'utf8');

// Strip HTML tags
const cleanText = content.replace(/<[^>]+>/g, ' ');

const keyword = 'mcp.doku.com';
const index = cleanText.indexOf(keyword);
if (index !== -1) {
  const start = Math.max(0, index - 200);
  const end = Math.min(cleanText.length, index + 300);
  console.log('Context:', cleanText.slice(start, end).replace(/\s+/g, ' ').trim());
} else {
  console.log('Not found');
}
