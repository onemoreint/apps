// Genera src/components/landMask.ts: máscara de tierra firme (1 bit por celda de 1°x1°)
// a partir de Natural Earth 110m (world-atlas). Se ejecuta una sola vez: node scripts/build-land-mask.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoContains } from 'd3-geo';

const topo = JSON.parse(readFileSync('node_modules/world-atlas/land-110m.json', 'utf8'));
const land = feature(topo, topo.objects.land);
const W = 360, H = 180;
const bytes = new Uint8Array((W * H) / 8);
let count = 0;
for (let y = 0; y < H; y++) {
  const lat = 89.5 - y;
  for (let x = 0; x < W; x++) {
    const lon = -179.5 + x;
    if (geoContains(land, [lon, lat])) {
      const i = y * W + x;
      bytes[i >> 3] |= 1 << (i & 7);
      count++;
    }
  }
}
const b64 = Buffer.from(bytes).toString('base64');
writeFileSync(
  'src/components/landMask.ts',
  `// Generado por scripts/build-land-mask.mjs — Natural Earth 110m (dominio público). No editar a mano.\nexport const LAND_W = ${W};\nexport const LAND_H = ${H};\nexport const LAND_MASK_B64 = '${b64}';\n`,
);
console.log('celdas de tierra:', count, 'bytes:', b64.length);
