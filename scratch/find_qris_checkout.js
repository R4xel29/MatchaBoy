const fs = require('fs');
const content = fs.readFileSync('src/app/api/checkout/route.ts', 'utf8');
const lines = content.split('\n');
console.log("Total lines in checkout route.ts:", lines.length);

// Let's find all occurrences of "QRIS" or "DOKU"
lines.forEach((line, index) => {
  if (line.toLowerCase().includes('qris') || line.toLowerCase().includes('doku') || line.toLowerCase().includes('paymentmethod')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
