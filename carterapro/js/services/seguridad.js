// PIN de acceso. Se guarda solo un hash PBKDF2-SHA256 con sal aleatoria (nunca el PIN en texto).
// Es un bloqueo de privacidad de la pantalla: no cifra la base de datos del navegador.
import * as config from './config.js';
import { ErrorNegocio } from '../domain/errores.js';

const ITERACIONES = 150000;
const MAX_INTENTOS = 5;
const ESPERA_MS = 30000;

const aHex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const deHex = hex => new Uint8Array(hex.match(/../g).map(h => parseInt(h, 16)));

async function derivar(pin, salHex, iteraciones) {
  if (!crypto?.subtle) throw new ErrorNegocio('SIN_CRIPTO', 'Este navegador no permite usar PIN. Abre la app desde https o instalada.');
  const clave = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: deHex(salHex), iterations: iteraciones }, clave, 256);
  return aHex(bits);
}

export const pinValido = pin => /^\d{4,8}$/.test(String(pin));

export async function activar(pin) {
  if (!pinValido(pin)) throw new ErrorNegocio('PIN', 'El PIN debe tener entre 4 y 8 números.');
  const sal = aHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await derivar(pin, sal, ITERACIONES);
  await config.guardar({ pinActivo: true, pinSalt: sal, pinHash: hash, pinIteraciones: ITERACIONES });
}

export async function desactivar() {
  await config.guardar({ pinActivo: false, pinSalt: null, pinHash: null, pinIteraciones: null });
}

// Control de intentos en memoria: tras 5 errores se espera 30 segundos.
let fallos = 0;
let bloqueadoHasta = 0;

export function esperaRestante() {
  return Math.max(0, bloqueadoHasta - Date.now());
}

/** @returns {Promise<boolean>} */
export async function verificar(pin) {
  const cfg = config.get();
  if (!cfg.pinActivo) return true;
  if (esperaRestante() > 0) return false;
  const hash = await derivar(String(pin), cfg.pinSalt, cfg.pinIteraciones || ITERACIONES);
  // Comparación en tiempo constante.
  let dif = hash.length ^ cfg.pinHash.length;
  for (let i = 0; i < hash.length; i++) dif |= hash.charCodeAt(i) ^ (cfg.pinHash.charCodeAt(i) || 0);
  if (dif === 0) { fallos = 0; return true; }
  fallos++;
  if (fallos >= MAX_INTENTOS) { fallos = 0; bloqueadoHasta = Date.now() + ESPERA_MS; }
  return false;
}

export const activo = () => !!config.get().pinActivo;
