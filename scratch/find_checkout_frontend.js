const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.next' && f !== '.git' && f !== 'dist' && f !== 'build') {
        walkDir(dirPath, callback);
      }
    } else {
      callback(dirPath);
    }
  });
}

console.log("Searching for '/api/checkout' in codebase...");
walkDir('src', (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('/api/checkout') && !filePath.includes('spmb')) {
    console.log(`Found in: ${filePath}`);
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('/api/checkout')) {
        console.log(`  Line ${index + 1}: ${line.trim()}`);
      }
    });
  }
});
