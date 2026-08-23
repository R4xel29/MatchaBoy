const sharp = require('sharp');
const fs = require('fs');

async function processTemplate() {
  const meta = await sharp('public/brand/table-qr-template-raw.png').metadata();
  console.log('Original size:', meta.width, 'x', meta.height);

  // Resize to 4x (1204 x 1736) for high DPI print quality
  const upscaledBuffer = await sharp('public/brand/table-qr-template-raw.png')
    .resize(1204, 1736, { kernel: sharp.kernel.lanczos3 })
    .toBuffer();

  // Find exact color around the number area in raw image
  const rawImage = sharp('public/brand/table-qr-template-raw.png');
  const { data, info } = await rawImage.raw().toBuffer({ resolveWithObject: true });
  
  // Sample pixel at (200, 240) in 301x434 (orange area near number)
  const pxIndex = (240 * 301 + 200) * info.channels;
  const r = data[pxIndex];
  const g = data[pxIndex + 1];
  const b = data[pxIndex + 2];
  const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  console.log(`Sampled orange color: rgb(${r},${g},${b}) -> ${hexColor}`);

  // Create SVG patch for the number slot
  // In 1204x1736: number 1 is between x=830 and x=1140, y=600 and y=970
  const orangePatchSvg = Buffer.from(`
    <svg width="1204" height="1736">
      <rect x="800" y="590" width="370" height="390" fill="${hexColor}" rx="10" />
    </svg>
  `);

  await sharp(upscaledBuffer)
    .composite([{ input: orangePatchSvg, top: 0, left: 0 }])
    .toFile('public/brand/table-qr-template-blank.png');

  console.log('Success! Created public/brand/table-qr-template-blank.png');
}

processTemplate().catch(console.error);
