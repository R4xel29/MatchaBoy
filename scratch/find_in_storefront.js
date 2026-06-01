const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', '(storefront)', 'StorefrontClient.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log('Total lines:', lines.length);

// Search for TopUpOverlay or BCA or bank
const keywords = ['TopUpOverlay', 'BCA', 'wallet', 'bank', 'bankName', 'accountNumber'];
lines.forEach((line, idx) => {
  const match = keywords.some(k => line.includes(k));
  if (match) {
    console.log(`${idx + 1}: ${line.trim().substring(0, 120)}`);
  }
});
