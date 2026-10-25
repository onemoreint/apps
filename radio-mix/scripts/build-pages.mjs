#!/usr/bin/env node
/**
 * Compila la app para GitHub Pages (repo onemoreint/apps, servido desde la rama main)
 * en la carpeta app/, que se publica tal cual.
 *
 *   npm run build:pages
 *
 * Variables opcionales:
 *   PUBLIC_URL              URL pública (por defecto la de onemoreint/apps)
 *   VITE_SPOTIFY_CLIENT_ID  Client ID de Spotify (público por diseño con PKCE).
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PUBLIC_URL = process.env.PUBLIC_URL ?? 'https://onemoreint.github.io/apps/radio-mix/app/';
const base = new URL(PUBLIC_URL).pathname;
const env = { ...process.env, VITE_BASE: base };
const run = (cmd) => execSync(cmd, { stdio: 'inherit', env });

run('npx tsc -b');
run('npx vite build --outDir app --emptyOutDir');
writeFileSync('app/.nojekyll', '');
console.log(`\nListo: app/ → ${PUBLIC_URL}`);
