// Convierte el build de un solo archivo en el formato de página publicable (sin <html>/<head>/<body>)
import { readFileSync, writeFileSync } from 'node:fs';
const html = readFileSync('dist-single/index.html', 'utf8');
const h0 = html.indexOf('<head>') + 6;
const h1 = html.lastIndexOf('</head>');
const b0 = html.lastIndexOf('<body>') + 6;
const b1 = html.lastIndexOf('</body>');
const head = html.slice(h0, h1);
const body = html.slice(b0, b1);
const title = '<title>ARQUIGEN 360</title>';
// solo se retiran las etiquetas del encabezado previas al primer <script>
const firstScript = head.indexOf('<script');
const pre = head.slice(0, firstScript).replace(/<meta[^>]*>/g, '').replace(/<title>[\s\S]*?<\/title>/, '').replace(/<link rel="preconnect"[^>]*>/g, '');
const out = `${title}\n${pre.trim()}\n${head.slice(firstScript).trim()}\n${body.trim()}\n`;
writeFileSync('dist-single/arquigen360.html', out);
console.log('ok', (out.length / 1024).toFixed(0), 'KB');
