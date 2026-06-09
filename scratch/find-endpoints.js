const fs = require('fs');

const filePath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\b202785a-176b-4f48-be75-ca50d974bd04\\.system_generated\\steps\\335\\content.md';
const content = fs.readFileSync(filePath, 'utf8');

// Strip HTML tags
const cleanText = content.replace(/<[^>]+>/g, ' ');

// Search for keywords and display snippet
const keywords = ['endpoint', 'base url', 'mcp-server', 'production', 'sandbox', 'doku-mcp-server'];
const regex = new RegExp(`(?:${keywords.join('|')})`, 'gi');

let match;
console.log('--- Matches ---');
while ((match = regex.exec(cleanText)) !== null) {
  const start = Math.max(0, match.index - 150);
  const end = Math.min(cleanText.length, match.index + 150);
  console.log(`[Keyword: ${match[0]}] ... ${cleanText.slice(start, end).replace(/\s+/g, ' ').trim()} ...`);
  console.log('-----------------------------');
}
