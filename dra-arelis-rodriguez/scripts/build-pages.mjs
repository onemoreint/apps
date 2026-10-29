#!/usr/bin/env node
/**
 * Compila la landing para GitHub Pages (repo onemoreint/apps, servido desde la rama
 * main) en la carpeta app/, que se publica tal cual.
 *
 *   npm run build:pages
 *
 * Variable opcional:
 *   PUBLIC_URL   URL pública de la página (por defecto la de onemoreint/apps)
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PUBLIC_URL = process.env.PUBLIC_URL ?? 'https://onemoreint.github.io/apps/dra-arelis-rodriguez/app/';
const env = { ...process.env, PUBLIC_URL, VITE_BASE: new URL(PUBLIC_URL).pathname };
const run = (cmd) => execSync(cmd, { stdio: 'inherit', env });

run('npx tsc -b');
run('npx vite build --outDir app --emptyOutDir');
writeFileSync('app/.nojekyll', '');
console.log(`\nListo: app/ → ${PUBLIC_URL}`);
