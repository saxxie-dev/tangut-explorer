import sharp from 'sharp';
import { writeFileSync } from 'fs';

const darkSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
  <rect width="100" height="100" fill="#241E1C"/>
  <text x="50" y="72" font-family="'Noto Serif Tangut', serif" font-size="70" fill="#FAF8F3" text-anchor="middle">𗼎</text>
</svg>`;

const lightSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
  <rect width="100" height="100" fill="#FAF8F3"/>
  <text x="50" y="72" font-family="'Noto Serif Tangut', serif" font-size="70" fill="#241E1C" text-anchor="middle">𗼎</text>
</svg>`;

async function generateFavicons() {
  // Dark mode (default)
  const darkSvg = Buffer.from(darkSvgContent);
  const darkSizes = [
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-512x512.png', size: 512 },
  ];

  for (const { name, size } of darkSizes) {
    await sharp(darkSvg)
      .resize(size, size)
      .png()
      .toFile(`public/${name}`);
    console.log(`Generated ${name}`);
  }

  // Light mode variants
  const lightSvg = Buffer.from(lightSvgContent);
  const lightSizes = [
    { name: 'favicon-32x32-light.png', size: 32 },
    { name: 'apple-touch-icon-light.png', size: 180 },
  ];

  for (const { name, size } of lightSizes) {
    await sharp(lightSvg)
      .resize(size, size)
      .png()
      .toFile(`public/${name}`);
    console.log(`Generated ${name}`);
  }

  // Keep both SVGs
  writeFileSync('public/favicon.svg', darkSvgContent);
  writeFileSync('public/favicon-light.svg', lightSvgContent);
  console.log('Generated favicon.svg and favicon-light.svg');
}

generateFavicons();
