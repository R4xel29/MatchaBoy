const fs = require('fs');
const path = require('path');

function walk(dir, results = []) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        walk(fullPath, results);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const allFiles = walk(path.join(__dirname, '../src'));
const matches = [];

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.toLowerCase().includes('walletbalance') || content.toLowerCase().includes('wallettransaction')) {
    matches.push(file);
  }
});

console.log("Files containing 'walletBalance' or 'walletTransaction':");
matches.forEach(m => console.log(path.relative(path.join(__dirname, '..'), m)));
