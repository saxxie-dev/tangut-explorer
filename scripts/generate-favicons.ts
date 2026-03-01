import sharp from 'sharp';
import { writeFileSync } from 'fs';

const svgTemplate = (textColor: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
  <text x="50" y="80" font-family="'Noto Serif Tangut', serif" font-size="85" fill="${textColor}" text-anchor="middle">𗼎</text>
</svg>`;

async function generateFavicons() {
  // Transparent PNGs with light text (works on dark backgrounds)
  const darkSvg = Buffer.from(svgTemplate('#FAF8F3'));
  const darkSizes = [
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-512x512.png', size: 512 },
  ];

  for (const { name, size } of darkSizes) {
    await sharp(darkSvg)
      .resize(size, size, { fit: 'fill' })
      .png()
      .toFile(`public/${name}`);
    console.log(`Generated ${name}`);
  }

  // Light mode PNGs - dark text (works on light backgrounds)
  const lightSvg = Buffer.from(svgTemplate('#241E1C'));
  const lightSizes = [
    { name: 'favicon-32x32-light.png', size: 32 },
    { name: 'apple-touch-icon-light.png', size: 180 },
  ];

  for (const { name, size } of lightSizes) {
    await sharp(lightSvg)
      .resize(size, size, { fit: 'fill' })
      .png()
      .toFile(`public/${name}`);
    console.log(`Generated ${name}`);
  }

  // Keep SVGs too
  writeFileSync('public/favicon.svg', svgTemplate('#FAF8F3'));
  writeFileSync('public/favicon-light.svg', svgTemplate('#241E1C'));
  console.log('Generated favicon.svg and favicon-light.svg');
}

generateFavicons();
