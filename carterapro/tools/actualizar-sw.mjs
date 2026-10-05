// Regenera la lista de archivos que el service worker guarda para uso sin conexión.
// Uso: node tools/actualizar-sw.mjs   (ejecútalo después de agregar o quitar archivos)
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const raiz = new URL('..', import.meta.url).pathname;
const listar = dir => readdirSync(join(raiz, dir)).flatMap(n => {
  const ruta = join(dir, n);
  return statSync(join(raiz, ruta)).isDirectory() ? listar(ruta) : [ruta];
});

const archivos = ['./', './index.html', './manifest.webmanifest',
  ...['css', 'icons', 'js'].flatMap(listar).sort().map(f => './' + f.replace(/\\/g, '/'))];

const sw = join(raiz, 'service-worker.js');
const texto = readFileSync(sw, 'utf8').replace(/const ARCHIVOS = \[[\s\S]*?\];/, `const ARCHIVOS = [\n${archivos.map(a => `  '${a}',`).join('\n')}\n];`);
writeFileSync(sw, texto);
console.log(`service-worker.js: ${archivos.length} archivos`);
