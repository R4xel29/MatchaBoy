const fs = require('fs');
const docPath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\58830622-cc2d-4fe6-b7b3-46249232146a\\.system_generated\\steps\\56\\content.md';
const html = fs.readFileSync(docPath, 'utf8');

// A very simple HTML tag stripper
let cleanText = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');
cleanText = cleanText.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '');
cleanText = cleanText.replace(/<[^>]+>/g, ' ');
cleanText = cleanText.replace(/\s+/g, ' ');

fs.writeFileSync('scratch/clean_content.txt', cleanText, 'utf8');
console.log("Written clean content of length:", cleanText.length);
