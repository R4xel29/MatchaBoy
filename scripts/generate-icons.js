const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sourcePath = path.join(__dirname, '../public/icons/arus.png');

const targets = [
  { path: path.join(__dirname, '../public/icons/icon-192.png'), width: 192, height: 192 },
  { path: path.join(__dirname, '../public/icons/icon-512.png'), width: 512, height: 512 },
  { path: path.join(__dirname, '../src/app/icon.png'), width: 32, height: 32 },
  { path: path.join(__dirname, '../src/app/favicon.ico'), width: 32, height: 32 }
];

async function generate() {
  if (!fs.existsSync(sourcePath)) {
    console.error('Source icon public/icons/arus.png not found at path: ' + sourcePath);
    process.exit(1);
  }

  console.log('Found source icon. Starting generation...');

  for (const target of targets) {
    try {
      // If target exists, delete it first to avoid conflicts
      if (fs.existsSync(target.path)) {
        fs.unlinkSync(target.path);
      }
      
      await sharp(sourcePath)
        .resize(target.width, target.height)
        .toFile(target.path);
      console.log(`✓ Successfully generated: ${path.basename(target.path)} (${target.width}x${target.height})`);
    } catch (err) {
      console.error(`✗ Error generating ${path.basename(target.path)}:`, err);
    }
  }
}

generate();
