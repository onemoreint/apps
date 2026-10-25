#!/usr/bin/env node
/** Genera los iconos PNG de la PWA a partir del logotipo SVG (colores de src/config/brand.ts). */
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';

const brandSrc = readFileSync(new URL('../src/config/brand.ts', import.meta.url), 'utf8');
const pick = (k) => /'(#[0-9a-fA-F]{6})'/.exec(brandSrc.slice(brandSrc.indexOf(`${k}:`)))[1];
const bg = pick('background');
const a1 = pick('accent');
const a2 = pick('accent2');

const art = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a1}"/><stop offset="1" stop-color="${a2}"/></linearGradient></defs>
  <rect width="512" height="512" fill="url(#g)" ${pad ? '' : 'rx="112"'}/>
  <g transform="translate(256 256) scale(${pad ? 0.62 : 0.86}) translate(-256 -256)">
    <path d="M112 320c40-112 80-112 120 0s80 112 120 0" fill="none" stroke="${bg}" stroke-width="40" stroke-linecap="round"/>
    <circle cx="400" cy="128" r="32" fill="${bg}"/>
  </g>
</svg>`;

mkdirSync(new URL('../public/icons/', import.meta.url), { recursive: true });
const out = (f) => new URL(`../public/icons/${f}`, import.meta.url).pathname;
await sharp(Buffer.from(art(false))).resize(192, 192).png().toFile(out('icon-192.png'));
await sharp(Buffer.from(art(false))).resize(512, 512).png().toFile(out('icon-512.png'));
await sharp(Buffer.from(art(true))).resize(512, 512).png().toFile(out('icon-512-maskable.png'));
await sharp(Buffer.from(art(true))).resize(180, 180).png().toFile(out('apple-touch-icon.png'));
console.log('Iconos generados en public/icons/');
