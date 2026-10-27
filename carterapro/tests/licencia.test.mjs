// Licencias: firma, verificación, alteraciones y límites de la versión de prueba.
import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { firmar, verificar, extraer, leer, dentroDelLimite, LIMITES_PRUEBA } from '../js/domain/licencia.js';

const subtle = webcrypto.subtle;

async function parDeClaves() {
  const k = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  return { pub: await subtle.exportKey('jwk', k.publicKey), priv: await subtle.exportKey('jwk', k.privateKey) };
}

test('licencia: una licencia firmada se verifica y trae los datos del comprador', async () => {
  const { pub, priv } = await parDeClaves();
  const lic = await firmar({ id: 'L-ABC123', n: 'Carlos Pérez', e: '2026-10-26', p: 'COMPLETA' }, priv, subtle);
  assert.match(lic, /^CP1\.[\w-]+\.[\w-]+$/);
  const r = await verificar(lic, subtle, pub);
  assert.equal(r.ok, true);
  assert.equal(r.datos.n, 'Carlos Pérez');
  // También desde el enlace de activación completo o con espacios alrededor.
  assert.equal((await verificar(`  https://x.io/carterapro/#/activar?l=${lic}  `, subtle, pub)).ok, true);
});

test('licencia: alterada, de otra clave o mal copiada no es válida', async () => {
  const { pub, priv } = await parDeClaves();
  const otra = await parDeClaves();
  const lic = await firmar({ id: 'L-1', n: 'Ana' }, priv, subtle);
  const [p, d, f] = lic.split('.');
  const datosFalsos = Buffer.from(JSON.stringify({ v: 1, id: 'L-1', n: 'Otra persona' })).toString('base64url');
  assert.equal((await verificar(`${p}.${datosFalsos}.${f}`, subtle, pub)).ok, false);
  assert.equal((await verificar(lic, subtle, otra.pub)).ok, false);
  assert.equal((await verificar(lic.slice(0, -6), subtle, pub)).ok, false);
  assert.equal((await verificar('hola', subtle, pub)).ok, false);
  assert.equal(extraer('nada aquí'), null);
  assert.equal(leer(`${p}.${d}.${f}`).datos.n, 'Ana');
});

test('licencia: límites de la versión de prueba sin contar los datos de demostración', () => {
  const reales = n => Array.from({ length: n }, (_, i) => ({ id: String(i) }));
  const demo = Array.from({ length: 10 }, () => ({ esDemo: true }));
  assert.equal(dentroDelLimite('clientes', [...reales(LIMITES_PRUEBA.clientes - 1), ...demo]).ok, true);
  assert.equal(dentroDelLimite('clientes', reales(LIMITES_PRUEBA.clientes)).ok, false);
  assert.equal(dentroDelLimite('creditos', reales(2)).usados, 2);
});

test('licencia: la clave privada nunca se publica con la app', async () => {
  const { readdirSync, readFileSync, statSync } = await import('node:fs');
  const { join } = await import('node:path');
  const raiz = new URL('..', import.meta.url).pathname;
  const listar = d => readdirSync(join(raiz, d)).flatMap(n => statSync(join(raiz, d, n)).isDirectory() ? listar(join(d, n)) : [join(d, n)]);
  const sospechosos = ['js', 'css', 'icons'].flatMap(listar).filter(f => /"d"\s*:\s*"[\w-]{40,}"/.test(readFileSync(join(raiz, f), 'utf8')));
  assert.deepEqual(sospechosos, []);
});
