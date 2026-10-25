#!/usr/bin/env node
/** Regenera vercel.json con las cabeceras de seguridad de src/config/security.ts (fuente única). */
import { writeFileSync } from 'node:fs';
import { SECURITY_HEADERS } from '../src/config/security.ts';

const headers = Object.entries(SECURITY_HEADERS).map(([key, value]) => ({ key, value }));
const config = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  buildCommand: 'npx vite build',
  outputDirectory: 'dist',
  headers: [
    { source: '/(.*)', headers },
    { source: '/assets/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
  ],
};
writeFileSync(new URL('../vercel.json', import.meta.url), `${JSON.stringify(config, null, 2)}\n`);
console.log('vercel.json actualizado');
