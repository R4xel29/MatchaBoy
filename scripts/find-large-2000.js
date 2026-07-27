const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('2000') && (line.toLowerCase().includes('large') || line.toLowerCase().includes('size') || line.includes('DRINK_SIZES'))) {
      console.log(`${filePath}:${idx + 1}: ${line.trim()}`);
    }
  });
}

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      searchDir(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      checkFile(fullPath);
    }
  }
}

searchDir(path.join(__dirname, '../src'));
