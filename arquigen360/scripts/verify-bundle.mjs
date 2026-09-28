// Verificación del HTML autocontenido antes de publicar (especificación 2026, §20 y §38).
// Uso: node scripts/verify-bundle.mjs [ruta] [--copy]
//   --copy  copia el HTML verificado a app/index.html (la versión que publica GitHub Pages)
import { readFileSync, copyFileSync, statSync } from 'node:fs';

const file = process.argv.find((a) => a.endsWith('.html')) ?? 'dist/index.html';
const html = readFileSync(file, 'utf8');
const problems = [];

// 1. un solo archivo: sin scripts ni hojas externas (salvo Google Fonts)
for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)) problems.push(`script externo: ${m[1]}`);
for (const m of html.matchAll(/<link[^>]+href=["']([^"']+)["']/g)) if (!/^https:\/\/fonts\.(googleapis|gstatic)\.com(\/|$)/.test(m[1])) problems.push(`recurso externo: ${m[1]}`);

// 2. secretos
const SECRETS = [
  [/sk-ant-[A-Za-z0-9_-]{10,}/, 'clave de Anthropic'],
  [/\bsk-[A-Za-z0-9]{20,}/, 'clave tipo sk-'],
  [/AKIA[0-9A-Z]{16}/, 'clave de AWS'],
  [/ghp_[A-Za-z0-9]{30,}/, 'token de GitHub'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'clave privada'],
  [/service_role/i, 'service_role de Supabase'],
  [/eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, 'JWT'],
];
for (const [re, label] of SECRETS) if (re.test(html)) problems.push(`posible secreto: ${label}`);

// 3. ejecución dinámica de código en el código propio (las librerías se informan aparte)
const evalCount = (html.match(/\beval\s*\(/g) ?? []).length;
const fnCount = (html.match(/\bnew Function\s*\(/g) ?? []).length;

// 4. tamaño
const size = statSync(file).size;
if (size > 16 * 1024 * 1024) problems.push(`tamaño ${(size / 1024 / 1024).toFixed(1)} MB supera 16 MB`);
if (!html.includes('<div id="root">')) problems.push('falta el contenedor #root');

console.log(`Archivo: ${file} · ${(size / 1024).toFixed(0)} KB`);
console.log(`eval(): ${evalCount} · new Function(): ${fnCount}`);
if (evalCount || fnCount) problems.push('el bundle contiene eval() o new Function()');

if (problems.length) {
  console.error('✗ Verificación fallida:\n  - ' + problems.join('\n  - '));
  process.exit(1);
}
console.log('✓ Un solo archivo, sin secretos, sin eval, tamaño correcto.');
if (process.argv.includes('--copy')) {
  copyFileSync(file, 'app/index.html');
  console.log('✓ Copiado a app/index.html');
}
