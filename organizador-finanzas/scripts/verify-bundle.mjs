// Verifica que la app publicada sea un único HTML autocontenido y sin código peligroso.
import { readFileSync, existsSync } from 'node:fs';
const f = process.argv[2] ?? 'app/index.html';
const html = readFileSync(f, 'utf8');
const fallos = [];
if (/<script[^>]+src=/i.test(html)) fallos.push('hay scripts externos');
if (/<link[^>]+rel="stylesheet"(?![^>]*fonts\.googleapis\.com)/i.test(html)) fallos.push('hay hojas de estilo externas distintas de Google Fonts');
if (/\beval\(|new Function\(/.test(html)) fallos.push('usa eval o new Function');
if (/sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{30,}/.test(html)) fallos.push('posible secreto en el código');
if (!/Content-Security-Policy/.test(html)) fallos.push('falta la política de seguridad de contenido');
for (const x of ['sw.js', 'manifest.webmanifest', 'icono-192.png', 'icono-512.png']) if (!existsSync(new URL(x, new URL(`file://${process.cwd()}/${f}`)))) fallos.push(`falta ${x}`);
if (fallos.length) { console.error('✗ ' + fallos.join('\n✗ ')); process.exit(1); }
console.log(`✓ ${f}: autocontenido, ${Math.round(html.length / 1024)} KB, con CSP y PWA`);
