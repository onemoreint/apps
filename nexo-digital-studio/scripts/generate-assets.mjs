// Genera los íconos PNG a partir de public/favicon.svg (uso: node scripts/generate-assets.mjs)
import sharp from "sharp";
import { readFileSync } from "node:fs";
const svg = readFileSync(new URL("../public/favicon.svg", import.meta.url));
const out = (n) => new URL(`../public/${n}`, import.meta.url).pathname;
for (const [name, size] of [["favicon-32.png", 32], ["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512]]) {
  await sharp(svg, { density: 600 }).resize(size, size).png().toFile(out(name));
  console.log("✓", name);
}
