#!/usr/bin/env node
// Une migraciones + seed en supabase/setup.sql para pegarlo de una vez en el SQL Editor de Supabase.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase');
const parts = [
  ...readdirSync(join(dir, 'migrations')).sort().map((f) => [`migrations/${f}`, readFileSync(join(dir, 'migrations', f), 'utf8')]),
  ['seed.sql', readFileSync(join(dir, 'seed.sql'), 'utf8')],
];
const header = `-- =============================================================================
-- MesaQR — INSTALACIÓN COMPLETA (generado por "npm run db:setup", no editar a mano)
-- Pega TODO este archivo en Supabase → SQL Editor → Run, UNA sola vez,
-- en un proyecto nuevo. Incluye: tablas, seguridad, funciones, fotos y datos demo.
-- =============================================================================
`;
writeFileSync(join(dir, 'setup.sql'), header + parts.map(([name, sql]) => `\n-- ───── ${name} ─────\n${sql}`).join('\n'));
console.log('supabase/setup.sql generado');
