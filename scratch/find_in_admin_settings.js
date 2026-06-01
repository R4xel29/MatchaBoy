const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', '(admin)', 'admin', 'payment-settings', 'PaymentSettingsClient.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log('Total lines:', lines.length);

const keywords = ['wallet', 'Wallet', 'MinTopUp', 'BonusPercent', 'bank', 'Bank'];
lines.forEach((line, idx) => {
  const match = keywords.some(k => line.includes(k));
  if (match) {
    console.log(`${idx + 1}: ${line.trim().substring(0, 120)}`);
  }
});
