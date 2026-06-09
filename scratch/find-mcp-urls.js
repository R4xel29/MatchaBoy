const fs = require('fs');

const filePath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\b202785a-176b-4f48-be75-ca50d974bd04\\.system_generated\\steps\\335\\content.md';
const content = fs.readFileSync(filePath, 'utf8');

// Find all matches for DOKU_MCP_URL
const regex = /DOKU_MCP_URL=[^\s"']+/gi;
const matches = content.match(regex) || [];
console.log('--- DOKU_MCP_URL Matches ---');
console.log(Array.from(new Set(matches)));

// Also look for production endpoints specifically
const prodRegex = /https?:\/\/api\.doku\.com[^\s"']*/gi;
const prodMatches = content.match(prodRegex) || [];
console.log('\n--- Production API Matches ---');
console.log(Array.from(new Set(prodMatches)));

// Let's print out the text where UAT or Sandbox or Production URL is configured
const cleanText = content.replace(/<[^>]+>/g, ' ');
const keywordRegex = /DOKU_MCP_URL/gi;
let match;
console.log('\n--- Snippets ---');
while ((match = keywordRegex.exec(cleanText)) !== null) {
  console.log(cleanText.slice(Math.max(0, match.index - 50), Math.min(cleanText.length, match.index + 150)).trim().replace(/\s+/g, ' '));
}
