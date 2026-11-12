// Generates build/icon.ico (all Windows sizes) from build/icon.svg.
// Usage: npm run icon
import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { readFile, writeFile, mkdir } from 'fs/promises'

const svg = await readFile(new URL('../build/icon.svg', import.meta.url))
const sizes = [16, 24, 32, 48, 64, 128, 256]

const pngs = []
for (const size of sizes) {
  const png = await sharp(svg, { density: Math.round(72 * (256 / 64)) })
    .resize(size, size)
    .png()
    .toBuffer()
  pngs.push(png)
}

const ico = await pngToIco(pngs)
await writeFile(new URL('../build/icon.ico', import.meta.url), ico)
console.log(`build/icon.ico written (${sizes.join(', ')})`)
