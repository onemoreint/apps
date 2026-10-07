#!/usr/bin/env node
/**
 * Compila la app para GitHub Pages servido desde la rama (repo onemoreint/apps),
 * en la carpeta app/ que se publica tal cual.
 *
 *   npm run build:pages
 *
 * Variables opcionales:
 *   PUBLIC_URL               URL pública de la app (por defecto la de onemoreint/apps)
 *   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY   si existen → modo completo con Supabase;
 *                            si no → modo demostración con el menú incluido.
 *   DEMO_WHATSAPP, DEMO_RATE  WhatsApp y tasa para el modo demostración.
 */
import { execSync } from 'node:child_process';

const PUBLIC_URL = process.env.PUBLIC_URL ?? 'https://onemoreint.github.io/apps/mesaqr/app/';
const base = new URL(PUBLIC_URL).pathname;
const env = { ...process.env, PUBLIC_URL, VITE_BASE: base, VITE_STATIC_HOSTING: '1', VITE_DEMO: '1' };
const run = (cmd) => execSync(cmd, { stdio: 'inherit', env });

run('node scripts/build-demo-data.mjs');
run('npx tsc -b');
run('npx vite build --outDir app --emptyOutDir');
run('node scripts/build-qr-sheet.mjs app');
run('node -e "require(\'fs\').writeFileSync(\'app/.nojekyll\', \'\')"');
console.log(`\nListo: app/ → ${PUBLIC_URL}`);
