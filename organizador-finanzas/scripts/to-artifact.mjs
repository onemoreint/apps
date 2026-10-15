// Versión para claude.ai Artifacts: quita <html>/<head>/<body>, la CSP propia y los enlaces de PWA.
import { readFileSync, writeFileSync } from 'node:fs';
const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/i)[1]
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')
  .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/i, '')
  .replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>/gi, '');
const body = html.match(/<body>([\s\S]*?)<\/body>/i)[1];
const title = head.match(/<title>[\s\S]*?<\/title>/i)[0];
writeFileSync(new URL('../artifact.html', import.meta.url), `${title}\n${head.replace(title, '').trim()}\n${body.trim()}\n`);
console.log('artifact.html listo');
