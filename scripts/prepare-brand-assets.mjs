import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

// Package the approved ImageGen artwork. No artwork, copy or logos are drawn here.
// Run: node scripts/prepare-brand-assets.mjs
const root = new URL('../', import.meta.url);
const path = relative => fileURLToPath(new URL(relative, root));

await sharp(path('assets/brand/tvsi-helpdesk-og-source.png'))
  .resize(1200, 630, { fit: 'cover' })
  .png({ compressionLevel: 9 })
  .toFile(path('public/brand/tvsi-helpdesk-og.png'));

const source = path('assets/brand/tvsi-helpdesk-icon-source.png');
const icon = await sharp(source).resize(256, 256, {
  fit: 'contain', background: '#FFFFFF00',
}).png().toBuffer();
await writeFile(path('src/app/icon.png'), icon);
await sharp(source).resize(180, 180, { fit: 'contain', background: '#FFFFFF' })
  .flatten({ background: '#FFFFFF' }).png()
  .toFile(path('src/app/apple-icon.png'));

// ICO directory containing PNG entries at native browser sizes.
const sizes = [16, 32, 48, 64, 128, 256];
const entries = await Promise.all(sizes.map(size => sharp(icon).resize(size, size).png().toBuffer()));
const directory = Buffer.alloc(6 + 16 * sizes.length);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
entries.forEach((entry, index) => {
  const position = 6 + 16 * index;
  directory[position] = sizes[index] === 256 ? 0 : sizes[index];
  directory[position + 1] = directory[position];
  directory.writeUInt16LE(1, position + 4);
  directory.writeUInt16LE(32, position + 6);
  directory.writeUInt32LE(entry.length, position + 8);
  directory.writeUInt32LE(offset, position + 12);
  offset += entry.length;
});
await writeFile(path('src/app/favicon.ico'), Buffer.concat([directory, ...entries]));
console.log('Prepared OG (1200 × 630), icon (256 × 256), Apple icon (180 × 180) and favicon.');
