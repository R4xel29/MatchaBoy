const fs = require('fs');
const content = fs.readFileSync('src/types/index.ts', 'utf8');
console.log(content);
