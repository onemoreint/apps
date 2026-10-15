// Perfiles locales con usuario y contraseña, y datos cifrados en el dispositivo.
//
// Esquema (cifrado de sobre):
//   DEK  = clave AES-GCM 256 aleatoria que cifra los datos del perfil.
//   KEK1 = PBKDF2-SHA256(contraseña, sal1)        → envuelve la DEK  (dekClave)
//   KEK2 = PBKDF2-SHA256(código de recuperación, sal2) → envuelve la DEK (dekRecuperacion)
// La contraseña nunca se guarda. Si la contraseña no descifra la DEK, es incorrecta.
// Sin la contraseña ni el código de recuperación, los datos no se pueden leer.

import type { Estado } from './finance';

export interface KV {
  get<T>(k: string): Promise<T | undefined>;
  set(k: string, v: unknown): Promise<void>;
  del(k: string): Promise<void>;
  keys(prefijo: string): Promise<string[]>;
}

interface Cifrado {
  iv: string;
  ct: string;
}

export interface Perfil {
  id: string;
  usuario: string;
  nombre: string;
  creado: string;
  ultimoAcceso: string | null;
  iter: number;
  salClave: string;
  salRecuperacion: string;
  dekClave: Cifrado;
  dekRecuperacion: Cifrado;
  fallos: number;
  bloqueadoHasta: number;
  /** minutos de inactividad antes de bloquear; 0 = nunca */
  autoBloqueo: number;
}

export interface Sesion {
  perfil: Perfil;
  dek: CryptoKey;
}

export type CodigoError = 'credenciales' | 'bloqueado' | 'usuario-existe' | 'usuario-invalido' | 'clave-debil' | 'codigo' | 'sin-cripto';

export class ErrorAcceso extends Error {
  constructor(public code: CodigoError, mensaje: string, public esperaMs = 0) {
    super(mensaje);
  }
}

export const ITERACIONES = 600_000; // recomendación OWASP para PBKDF2-SHA256
export const MAX_FALLOS = 5;
const enc = new TextEncoder();
const dec = new TextDecoder();

function cripto(): SubtleCrypto {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new ErrorAcceso('sin-cripto', 'Este navegador no permite cifrar. Abre la app desde https:// o con un navegador actualizado.');
  return s;
}

const b64 = (b: ArrayBuffer | Uint8Array) => {
  const u = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = '';
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
};
const deB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const aleatorio = (n: number) => crypto.getRandomValues(new Uint8Array(n));

async function derivar(secreto: string, sal: string, iter: number): Promise<CryptoKey> {
  const base = await cripto().importKey('raw', enc.encode(secreto.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return cripto().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: deB64(sal), iterations: iter },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function cifrar(clave: CryptoKey, datos: Uint8Array, aad: string): Promise<Cifrado> {
  const iv = aleatorio(12);
  const ct = await cripto().encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aad) }, clave, datos);
  return { iv: b64(iv), ct: b64(ct) };
}

async function descifrar(clave: CryptoKey, c: Cifrado, aad: string): Promise<Uint8Array> {
  const pt = await cripto().decrypt({ name: 'AES-GCM', iv: deB64(c.iv), additionalData: enc.encode(aad) }, clave, deB64(c.ct));
  return new Uint8Array(pt);
}

async function envolver(dekRaw: Uint8Array, secreto: string, sal: string, iter: number, aad: string) {
  return cifrar(await derivar(secreto, sal, iter), dekRaw, aad);
}

async function desenvolver(c: Cifrado, secreto: string, sal: string, iter: number, aad: string): Promise<{ dek: CryptoKey; raw: Uint8Array } | null> {
  try {
    const raw = await descifrar(await derivar(secreto, sal, iter), c, aad);
    const dek = await cripto().importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
    return { dek, raw };
  } catch {
    return null;
  }
}

// ——— Reglas ———

export function normalizarUsuario(u: string) {
  return u.trim().toLowerCase();
}

export function validarUsuario(u: string): string | null {
  const n = normalizarUsuario(u);
  if (n.length < 3) return 'El usuario debe tener al menos 3 caracteres.';
  if (n.length > 30) return 'El usuario puede tener máximo 30 caracteres.';
  if (!/^[a-z0-9._-]+$/.test(n)) return 'Usa solo letras sin tilde, números, punto, guion o guion bajo.';
  return null;
}

/** Devuelve un mensaje si la contraseña no cumple el mínimo; null si sirve. */
export function validarClave(c: string, usuario = ''): string | null {
  if (c.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (c.length > 128) return 'La contraseña es demasiado larga.';
  if (usuario && c.toLowerCase().includes(normalizarUsuario(usuario))) return 'La contraseña no puede contener tu usuario.';
  if (/^(.)\1+$/.test(c) || /^(12345678|123456789|1234567890|password|contraseña|qwertyui)/i.test(c)) return 'Esa contraseña es muy fácil de adivinar.';
  return null;
}

/** 0 a 4: muy débil → fuerte (solo orientativo). */
export function fuerzaClave(c: string): number {
  let p = 0;
  if (c.length >= 8) p++;
  if (c.length >= 12) p++;
  if (/[a-z]/.test(c) && /[A-Z]/.test(c)) p++;
  if (/\d/.test(c) && /[^A-Za-z0-9]/.test(c)) p++;
  return Math.min(4, p);
}

const ALFABETO = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'; // sin 0/O, 1/I/L, U
export function generarCodigo(): string {
  const bytes = aleatorio(20);
  let s = '';
  for (const b of bytes) s += ALFABETO[b % ALFABETO.length];
  return s.match(/.{5}/g)!.join('-');
}
export const normalizarCodigo = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');

// ——— Operaciones ———

const kPerfil = (id: string) => `perfil:${id}`;
const kDatos = (id: string) => `datos:${id}`;
const aadDek = (id: string) => `dek:${id}`;
const aadDatos = (id: string) => `datos:${id}`;

export async function listarPerfiles(kv: KV): Promise<Perfil[]> {
  const ks = await kv.keys('perfil:');
  const ps = await Promise.all(ks.map((k) => kv.get<Perfil>(k)));
  return ps.filter((p): p is Perfil => !!p);
}

async function buscar(kv: KV, usuario: string) {
  const n = normalizarUsuario(usuario);
  return (await listarPerfiles(kv)).find((p) => p.usuario === n);
}

export async function crearPerfil(
  kv: KV,
  datos: { usuario: string; nombre: string; clave: string },
  iter = ITERACIONES,
): Promise<{ sesion: Sesion; codigo: string }> {
  const eu = validarUsuario(datos.usuario);
  if (eu) throw new ErrorAcceso('usuario-invalido', eu);
  const ec = validarClave(datos.clave, datos.usuario);
  if (ec) throw new ErrorAcceso('clave-debil', ec);
  if (await buscar(kv, datos.usuario)) throw new ErrorAcceso('usuario-existe', 'Ya existe un perfil con ese usuario en este dispositivo.');

  const id = b64(aleatorio(9)).replace(/[+/=]/g, 'x');
  const raw = aleatorio(32);
  const codigo = generarCodigo();
  const salClave = b64(aleatorio(16));
  const salRecuperacion = b64(aleatorio(16));
  const perfil: Perfil = {
    id,
    usuario: normalizarUsuario(datos.usuario),
    nombre: datos.nombre.trim().slice(0, 40) || normalizarUsuario(datos.usuario),
    creado: new Date().toISOString(),
    ultimoAcceso: new Date().toISOString(),
    iter,
    salClave,
    salRecuperacion,
    dekClave: await envolver(raw, datos.clave, salClave, iter, aadDek(id)),
    dekRecuperacion: await envolver(raw, normalizarCodigo(codigo), salRecuperacion, iter, aadDek(id)),
    fallos: 0,
    bloqueadoHasta: 0,
    autoBloqueo: 15,
  };
  await kv.set(kPerfil(id), perfil);
  const dek = await cripto().importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
  return { sesion: { perfil, dek }, codigo };
}

/** Espera tras fallos: 30 s, 1 min, 2 min… hasta 15 min. */
export function esperaPorFallos(fallos: number) {
  if (fallos < MAX_FALLOS) return 0;
  return Math.min(15 * 60_000, 30_000 * 2 ** (fallos - MAX_FALLOS));
}

export async function iniciarSesion(kv: KV, usuario: string, clave: string, ahora = Date.now()): Promise<Sesion> {
  const p = await buscar(kv, usuario);
  if (!p) throw new ErrorAcceso('credenciales', 'Usuario o contraseña incorrectos.');
  if (p.bloqueadoHasta > ahora) {
    const ms = p.bloqueadoHasta - ahora;
    throw new ErrorAcceso('bloqueado', `Demasiados intentos. Espera ${formatoEspera(ms)}.`, ms);
  }
  const r = await desenvolver(p.dekClave, clave, p.salClave, p.iter, aadDek(p.id));
  if (!r) {
    const fallos = p.fallos + 1;
    const espera = esperaPorFallos(fallos);
    await kv.set(kPerfil(p.id), { ...p, fallos, bloqueadoHasta: espera ? ahora + espera : 0 });
    if (espera) throw new ErrorAcceso('bloqueado', `Contraseña incorrecta. Por seguridad espera ${formatoEspera(espera)}.`, espera);
    const quedan = MAX_FALLOS - fallos;
    throw new ErrorAcceso('credenciales', `Usuario o contraseña incorrectos.${quedan <= 2 ? ` Te quedan ${quedan} intento(s) antes de una pausa.` : ''}`);
  }
  const perfil = { ...p, fallos: 0, bloqueadoHasta: 0, ultimoAcceso: new Date(ahora).toISOString() };
  await kv.set(kPerfil(p.id), perfil);
  return { perfil, dek: r.dek };
}

export function formatoEspera(ms: number) {
  const s = Math.ceil(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.ceil(s / 60)} min`;
}

export async function recuperarConCodigo(kv: KV, usuario: string, codigo: string, nuevaClave: string, ahora = Date.now()): Promise<{ sesion: Sesion; codigo: string }> {
  const p = await buscar(kv, usuario);
  if (!p) throw new ErrorAcceso('codigo', 'Usuario o código de recuperación incorrectos.');
  if (p.bloqueadoHasta > ahora) throw new ErrorAcceso('bloqueado', `Demasiados intentos. Espera ${formatoEspera(p.bloqueadoHasta - ahora)}.`, p.bloqueadoHasta - ahora);
  const ec = validarClave(nuevaClave, usuario);
  if (ec) throw new ErrorAcceso('clave-debil', ec);
  const r = await desenvolver(p.dekRecuperacion, normalizarCodigo(codigo), p.salRecuperacion, p.iter, aadDek(p.id));
  if (!r) {
    const fallos = p.fallos + 1;
    const espera = esperaPorFallos(fallos);
    await kv.set(kPerfil(p.id), { ...p, fallos, bloqueadoHasta: espera ? ahora + espera : 0 });
    throw new ErrorAcceso(espera ? 'bloqueado' : 'codigo', 'Usuario o código de recuperación incorrectos.', espera);
  }
  // el código usado se reemplaza por uno nuevo
  const nuevoCodigo = generarCodigo();
  const salClave = b64(aleatorio(16));
  const salRecuperacion = b64(aleatorio(16));
  const perfil: Perfil = {
    ...p,
    salClave,
    salRecuperacion,
    dekClave: await envolver(r.raw, nuevaClave, salClave, p.iter, aadDek(p.id)),
    dekRecuperacion: await envolver(r.raw, normalizarCodigo(nuevoCodigo), salRecuperacion, p.iter, aadDek(p.id)),
    fallos: 0,
    bloqueadoHasta: 0,
    ultimoAcceso: new Date(ahora).toISOString(),
  };
  await kv.set(kPerfil(p.id), perfil);
  return { sesion: { perfil, dek: r.dek }, codigo: nuevoCodigo };
}

export async function cambiarClave(kv: KV, s: Sesion, actual: string, nueva: string): Promise<Sesion> {
  const p = (await kv.get<Perfil>(kPerfil(s.perfil.id)))!;
  const r = await desenvolver(p.dekClave, actual, p.salClave, p.iter, aadDek(p.id));
  if (!r) throw new ErrorAcceso('credenciales', 'La contraseña actual no es correcta.');
  const ec = validarClave(nueva, p.usuario);
  if (ec) throw new ErrorAcceso('clave-debil', ec);
  const salClave = b64(aleatorio(16));
  const perfil = { ...p, salClave, dekClave: await envolver(r.raw, nueva, salClave, p.iter, aadDek(p.id)) };
  await kv.set(kPerfil(p.id), perfil);
  return { perfil, dek: s.dek };
}

export async function nuevoCodigoRecuperacion(kv: KV, s: Sesion, clave: string): Promise<{ sesion: Sesion; codigo: string }> {
  const p = (await kv.get<Perfil>(kPerfil(s.perfil.id)))!;
  const r = await desenvolver(p.dekClave, clave, p.salClave, p.iter, aadDek(p.id));
  if (!r) throw new ErrorAcceso('credenciales', 'La contraseña no es correcta.');
  const codigo = generarCodigo();
  const salRecuperacion = b64(aleatorio(16));
  const perfil = { ...p, salRecuperacion, dekRecuperacion: await envolver(r.raw, normalizarCodigo(codigo), salRecuperacion, p.iter, aadDek(p.id)) };
  await kv.set(kPerfil(p.id), perfil);
  return { sesion: { perfil, dek: s.dek }, codigo };
}

export async function actualizarPerfil(kv: KV, s: Sesion, cambios: Partial<Pick<Perfil, 'nombre' | 'autoBloqueo'>>): Promise<Sesion> {
  const p = (await kv.get<Perfil>(kPerfil(s.perfil.id)))!;
  const perfil = { ...p, ...cambios };
  await kv.set(kPerfil(p.id), perfil);
  return { ...s, perfil };
}

export async function eliminarPerfil(kv: KV, s: Sesion, clave: string) {
  const p = (await kv.get<Perfil>(kPerfil(s.perfil.id)))!;
  const r = await desenvolver(p.dekClave, clave, p.salClave, p.iter, aadDek(p.id));
  if (!r) throw new ErrorAcceso('credenciales', 'La contraseña no es correcta.');
  await kv.del(kDatos(p.id));
  await kv.del(kPerfil(p.id));
}

export async function guardarDatos(kv: KV, s: Sesion, e: Estado) {
  const c = await cifrar(s.dek, enc.encode(JSON.stringify(e)), aadDatos(s.perfil.id));
  await kv.set(kDatos(s.perfil.id), { ...c, v: 1, guardado: new Date().toISOString() });
}

export async function cargarDatos(kv: KV, s: Sesion): Promise<Estado | null> {
  const c = await kv.get<Cifrado>(kDatos(s.perfil.id));
  if (!c) return null;
  const pt = await descifrar(s.dek, c, aadDatos(s.perfil.id));
  return JSON.parse(dec.decode(pt)) as Estado;
}

// ——— Almacenes ———

export function kvMemoria(): KV {
  const m = new Map<string, unknown>();
  return {
    get: async (k) => structuredClone(m.get(k)) as never,
    set: async (k, v) => void m.set(k, structuredClone(v)),
    del: async (k) => void m.delete(k),
    keys: async (p) => [...m.keys()].filter((k) => k.startsWith(p)),
  };
}

/** IndexedDB del navegador: base "organizador-finanzas", almacén "kv". */
export async function kvIndexedDB(): Promise<KV> {
  const db = await new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open('organizador-finanzas', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error('IndexedDB bloqueada'));
  });
  const tx = <T>(modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>) =>
    new Promise<T>((res, rej) => {
      const t = db.transaction('kv', modo);
      const r = f(t.objectStore('kv'));
      t.oncomplete = () => res(r.result);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  return {
    get: (k) => tx('readonly', (s) => s.get(k)),
    set: async (k, v) => void (await tx('readwrite', (s) => s.put(v, k))),
    del: async (k) => void (await tx('readwrite', (s) => s.delete(k))),
    keys: async (p) => ((await tx('readonly', (s) => s.getAllKeys())) as IDBValidKey[]).map(String).filter((k) => k.startsWith(p)),
  };
}

/** Respaldo cuando IndexedDB no está disponible. */
export function kvLocalStorage(prefijo = 'of:'): KV {
  return {
    get: async (k) => {
      const t = localStorage.getItem(prefijo + k);
      return t ? JSON.parse(t) : undefined;
    },
    set: async (k, v) => localStorage.setItem(prefijo + k, JSON.stringify(v)),
    del: async (k) => localStorage.removeItem(prefijo + k),
    keys: async (p) => Object.keys(localStorage).filter((k) => k.startsWith(prefijo + p)).map((k) => k.slice(prefijo.length)),
  };
}

export async function abrirKV(): Promise<{ kv: KV; tipo: 'indexeddb' | 'localstorage' | 'memoria' }> {
  try {
    if (typeof indexedDB !== 'undefined') {
      const kv = await kvIndexedDB();
      await kv.keys('');
      // pide al navegador no borrar estos datos cuando falte espacio
      navigator.storage?.persist?.().catch(() => undefined);
      return { kv, tipo: 'indexeddb' };
    }
  } catch {
    /* sigue */
  }
  try {
    localStorage.setItem('__t', '1');
    localStorage.removeItem('__t');
    return { kv: kvLocalStorage(), tipo: 'localstorage' };
  } catch {
    return { kv: kvMemoria(), tipo: 'memoria' };
  }
}
