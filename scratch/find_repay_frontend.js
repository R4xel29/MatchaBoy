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

console.log("Searching for '/repay' in codebase...");
walkDir('src', (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('/repay')) {
    console.log(`Found in: ${filePath}`);
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('/repay')) {
        console.log(`  Line ${index + 1}: ${line.trim()}`);
      }
    });
  }
});
