const fs = require('fs');

function getPNGDimensions(filepath) {
  const buffer = fs.readFileSync(filepath);
  
  // PNG signature check
  if (buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
    throw new Error('Not a valid PNG file');
  }
  
  // Read IHDR chunk (starts at byte 16)
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  
  return { width, height };
}

try {
  const dayHeader = getPNGDimensions('c:/UBIG/Matchaboy/matchaboy/public/banners/day_header_bg.png');
  const nightHeader = getPNGDimensions('c:/UBIG/Matchaboy/matchaboy/public/banners/night_header_bg.png');
  
  console.log('Day Header:', dayHeader.width, 'x', dayHeader.height, 'px');
  console.log('Night Header:', nightHeader.width, 'x', nightHeader.height, 'px');
} catch (error) {
  console.error('Error:', error.message);
}
