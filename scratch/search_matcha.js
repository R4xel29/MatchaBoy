const fs = require('fs');
const path = require('path');

function searchDir(dir, pattern) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.next') {
                searchDir(filePath, pattern);
            }
        } else if (stat.isFile()) {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes(pattern)) {
                console.log(`Found in: ${filePath}`);
            }
        }
    }
}

searchDir('src', 'matchaLevel');
