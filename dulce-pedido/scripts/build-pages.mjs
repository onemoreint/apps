#!/usr/bin/env node
/**
 * Compila la tienda para GitHub Pages (repo onemoreint/apps, servido desde la rama
 * main) en la carpeta app/, que se publica tal cual.
 *
 *   npm run build:pages
 *
 * Variables opcionales:
 *   PUBLIC_URL               URL pública de la app (por defecto la de onemoreint/apps)
 *   VITE_SUPABASE_URL        URL del proyecto Supabase
 *   VITE_SUPABASE_ANON_KEY   clave PUBLICABLE (anon). Nunca la service_role.
 *   VITE_TIENDA              tienda que abre el enlace sin ?tienda=
 *   SIN_SERVIDOR=1           compila en modo demostración (sin base de datos)
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

// Proyecto Supabase de producción. La clave publicable está hecha para el navegador:
// la seguridad la dan las políticas RLS y las funciones de la base de datos.
const SUPABASE = {
  VITE_SUPABASE_URL: 'https://nkzjjrbzdfyppsxvcvbg.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'sb_publishable_tG6MVcZDRJvlAnb5TNEzwQ_04drexLP',
};

const PUBLIC_URL = process.env.PUBLIC_URL ?? 'https://onemoreint.github.io/apps/dulce-pedido/app/';
const base = new URL(PUBLIC_URL).pathname;
const env = {
  ...(process.env.SIN_SERVIDOR ? {} : SUPABASE),
  ...process.env,
  PUBLIC_URL,
  VITE_BASE: base,
  VITE_TIENDA: process.env.VITE_TIENDA ?? 'dulce-pedido-demo',
};
if (process.env.SIN_SERVIDOR) {
  delete env.VITE_SUPABASE_URL;
  delete env.VITE_SUPABASE_ANON_KEY;
}
const run = (cmd) => execSync(cmd, { stdio: 'inherit', env });

run('node --experimental-strip-types --no-warnings scripts/build-demo-data.ts');
run('npx tsc -b');
run('npx vite build --outDir app --emptyOutDir');
writeFileSync('app/.nojekyll', '');
console.log(`\nListo: app/ → ${PUBLIC_URL} (${env.VITE_SUPABASE_URL ? 'con Supabase' : 'modo demostración'})`);
