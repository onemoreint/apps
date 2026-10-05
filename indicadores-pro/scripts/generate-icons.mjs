// Genera los íconos PNG de la PWA a partir del isotipo SVG. Uso: node scripts/generate-icons.mjs
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const out = 'public/icons'
mkdirSync(out, { recursive: true })

const mark = (size, { pad = 0, radius = 8, bg = '#2563EB' } = {}) => {
  const inner = 32 - pad * 2
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="${radius}" fill="${bg}"/>
  <g transform="translate(${pad} ${pad}) scale(${inner / 32})">
    <rect x="7" y="17" width="4" height="8" rx="1.5" fill="#fff" opacity=".65"/>
    <rect x="14" y="12" width="4" height="13" rx="1.5" fill="#fff" opacity=".85"/>
    <rect x="21" y="8" width="4" height="17" rx="1.5" fill="#fff"/>
    <circle cx="23" cy="5.5" r="1.6" fill="#fff"/>
  </g></svg>`)
}

await sharp(mark(192)).png().toFile(`${out}/icon-192.png`)
await sharp(mark(512)).png().toFile(`${out}/icon-512.png`)
// Maskable: fondo completo y zona segura del 80 %.
await sharp(mark(512, { pad: 4, radius: 0 })).png().toFile(`${out}/icon-maskable-512.png`)
await sharp(mark(180, { pad: 2, radius: 0 })).png().toFile(`${out}/apple-touch-icon.png`)

const og = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0F172A"/>
  <g transform="translate(96 96) scale(4)">
    <rect width="32" height="32" rx="8" fill="#2563EB"/>
    <rect x="7" y="17" width="4" height="8" rx="1.5" fill="#fff" opacity=".65"/>
    <rect x="14" y="12" width="4" height="13" rx="1.5" fill="#fff" opacity=".85"/>
    <rect x="21" y="8" width="4" height="17" rx="1.5" fill="#fff"/>
    <circle cx="23" cy="5.5" r="1.6" fill="#fff"/>
  </g>
  <text x="96" y="340" font-family="Inter, Arial, sans-serif" font-size="72" font-weight="700" fill="#fff">INDICADORES PRO</text>
  <text x="96" y="410" font-family="Inter, Arial, sans-serif" font-size="32" fill="#94A3B8">Gestión, seguimiento y mejora de indicadores KPI y SGC</text>
  <g fill="#2563EB" opacity=".35">${[0,1,2,3,4,5].map(i=>`<rect x="${760+i*64}" y="${560-(i+2)*40}" width="40" height="${(i+2)*40}" rx="8"/>`).join('')}</g>
</svg>`)
await sharp(og).png().toFile(`${out}/og-image.png`)
console.log('íconos generados')
