const fs = require('fs');
const docPath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\58830622-cc2d-4fe6-b7b3-46249232146a\\.system_generated\\steps\\56\\content.md';
const content = fs.readFileSync(docPath, 'utf8');

// Find all matches of create_qris_payment or qris
const lines = content.split('\n');
console.log("Total lines:", lines.length);

lines.forEach((line, index) => {
  if (line.toLowerCase().includes('qris_payment') || line.toLowerCase().includes('create_qris_payment') || line.toLowerCase().includes('mcp-server')) {
    console.log(`Line ${index + 1}: ${line.trim().slice(0, 150)}`);
  }
});
