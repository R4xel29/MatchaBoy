const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    lines.forEach(line => {
        if (line.includes('MAP') || line.includes('GOOGLE') || line.includes('GEOCODE') || line.includes('LOCATION')) {
            const parts = line.split('=');
            console.log(`${parts[0]}: ${parts[1] ? 'defined (starts with ' + parts[1].substring(0, 5) + '...)' : 'empty'}`);
        }
    });
} else {
    console.log('.env not found');
}
