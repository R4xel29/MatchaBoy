const fs = require('fs');

const filePath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\b202785a-176b-4f48-be75-ca50d974bd04\\.system_generated\\steps\\313\\content.md';
const content = fs.readFileSync(filePath, 'utf8');

// Strip HTML tags roughly to extract text blocks
const textContent = content.replace(/<[^>]+>/g, ' ');

// Find all URLs
const urlRegex = /https?:\/\/[^\s"<>]+/g;
const urls = textContent.match(urlRegex) || [];
console.log('--- Found URLs ---');
const uniqueUrls = Array.from(new Set(urls));
uniqueUrls.forEach(url => {
  if (url.includes('doku') || url.includes('mcp')) {
    console.log(url);
  }
});

console.log('\n--- Text Snippets containing mcp or endpoint ---');
const regex = /[^.!?]*?(?:mcp|endpoint|sandbox|production)[^.!?]*?[.!?]/gi;
const matches = textContent.match(regex) || [];
const uniqueMatches = Array.from(new Set(matches.map(m => m.trim().replace(/\s+/g, ' '))));
uniqueMatches.forEach(m => {
  if (m.length > 10) {
    console.log('- ' + m);
  }
});
