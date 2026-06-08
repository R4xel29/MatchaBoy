const fs = require('fs');
const docPath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\58830622-cc2d-4fe6-b7b3-46249232146a\\.system_generated\\steps\\56\\content.md';
const content = fs.readFileSync(docPath, 'utf8');

const query = 'create_qris_payment';
let idx = content.indexOf(query);
while (idx !== -1) {
  console.log(`Found "${query}" at position ${idx}`);
  console.log(content.slice(idx - 100, idx + 400));
  console.log("-----------------------------------------");
  idx = content.indexOf(query, idx + 1);
}
