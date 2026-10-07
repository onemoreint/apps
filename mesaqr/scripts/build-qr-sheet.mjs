#!/usr/bin/env node
/**
 * Hoja imprimible con los QR de las mesas del MODO DEMOSTRACIÓN.
 * (Con Supabase conectado, los QR se generan desde el panel → Mesas.)
 *
 *   PUBLIC_URL=https://onemoreint.github.io/apps/mesaqr/app/ node scripts/build-qr-sheet.mjs <outDir>
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2] ?? join(root, 'dist');
const publicUrl = process.env.PUBLIC_URL;
if (!publicUrl) throw new Error('Falta PUBLIC_URL (URL pública de la app, terminada en /)');

const { menu, tables } = JSON.parse(readFileSync(join(root, 'public/demo-data/menu.json'), 'utf8'));
const name = menu.business.name.replace(/[<&>]/g, '');
const brand = menu.business.primary_color;

const cards = await Promise.all(
  tables.map(async (t) => {
    const url = `${publicUrl}?mesa=${t.token}`;
    const svg = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1A1714', light: '#FFFFFF' } });
    return `<article class="card"><header style="background:${brand}">${name}</header><p class="cta">Escanea para ver el menú</p><div class="qr">${svg}</div><div class="mesa">Mesa ${t.number}</div><p class="foot">Pide desde tu teléfono por WhatsApp</p></article>`;
  }),
);

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>QR de las mesas · ${name}</title>
<style>
@page{size:auto;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1A1714;background:#F4F2EF}
.bar{position:sticky;top:0;display:flex;gap:12px;align-items:center;padding:12px 16px;background:#fff;border-bottom:1px solid #E7E3DE}
.bar a{color:#1A1714;font-weight:600}.bar button{margin-left:auto;height:44px;padding:0 18px;border:0;border-radius:12px;background:#1A1714;color:#fff;font-weight:700;font-size:15px}
.grid{display:grid;grid-template-columns:repeat(2,80mm);gap:6mm;justify-content:center;padding:16px}
.card{height:118mm;background:#fff;border:.4mm solid rgba(26,23,20,.25);border-radius:5mm;overflow:hidden;display:flex;flex-direction:column;align-items:center;text-align:center;break-inside:avoid}
.card header{width:100%;padding:3.5mm 4mm;color:#fff;font-weight:800;font-size:5.5mm}
.cta{margin:4mm 0 0;font-weight:700;font-size:5mm}.qr{width:56mm;margin-top:2mm}.qr svg{width:100%;height:auto;display:block}
.mesa{margin-top:3mm;background:#FFC530;border-radius:2.5mm;padding:1.5mm 7mm;font-weight:800;font-size:11mm;line-height:1}
.foot{margin:auto 0 4mm;font-size:3.4mm;color:#5B554F}
@media print{.bar{display:none}body{background:#fff}.grid{padding:0}}
@media (max-width:420px){.grid{grid-template-columns:80mm}}
</style></head><body>
<div class="bar"><a href="../">← Menú</a><span>${tables.length} mesas</span><button onclick="print()">Imprimir</button></div>
<div class="grid">${cards.join('')}</div></body></html>`;

mkdirSync(join(outDir, 'qr'), { recursive: true });
writeFileSync(join(outDir, 'qr/index.html'), html);
console.log(`qr/index.html: ${tables.length} QR → ${publicUrl}?mesa=…`);
