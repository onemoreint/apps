// Licencias de CarteraPro. Una licencia es un texto firmado (ECDSA P-256 / SHA-256):
//   CP1.<datos en base64url>.<firma en base64url>
// La app solo tiene la clave pública: puede comprobar una licencia, pero no fabricarla.
// La clave privada vive únicamente en el generador de licencias del dueño.

export const PREFIJO = 'CP1';

/** Clave pública con la que se verifican las licencias. */
export const CLAVE_PUBLICA = { kty: 'EC', crv: 'P-256', x: 'eqOyVsyoSPFV7aGGOSjX1NEyRdG5c4QJIEa2x59sDdI', y: 'ge1wNjQDTtY9UQaJG2n61OQkMeIuSOgmfubpto1O6Uo' };

/** Lo que permite la versión de prueba. */
export const LIMITES_PRUEBA = { clientes: 5, creditos: 5 };

/** Funciones que la versión de prueba no permite (sacar o meter datos en bloque). */
export const BLOQUEADO_EN_PRUEBA = {
  exportar: 'La copia de seguridad y la exportación a Excel',
  importar: 'La importación de clientes',
  restaurar: 'La restauración de copias',
};

export const aBase64Url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function deBase64Url(s) {
  const b = atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4));
  return Uint8Array.from(b, c => c.charCodeAt(0));
}

/** Extrae la licencia de un texto pegado (acepta el enlace de activación completo). */
export function extraer(texto) {
  const t = String(texto || '').trim();
  const m = t.match(/CP1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  return m ? m[0] : null;
}

/** Separa la licencia en datos y firma sin verificarla. @returns {{datos, bytes, firma}|null} */
export function leer(licencia) {
  const l = extraer(licencia);
  if (!l) return null;
  const [, d, f] = l.split('.');
  try {
    const bytes = deBase64Url(d);
    const datos = JSON.parse(new TextDecoder().decode(bytes));
    if (datos?.v !== 1 || !datos.id || !datos.n) return null;
    return { datos, bytes, firma: deBase64Url(f), texto: l };
  } catch {
    return null;
  }
}

/**
 * Verifica la firma. `subtle` es crypto.subtle (navegador o Node).
 * @returns {Promise<{ok:boolean, datos?:object, motivo?:string}>}
 */
export async function verificar(licencia, subtle = globalThis.crypto?.subtle, clave = CLAVE_PUBLICA) {
  const l = leer(licencia);
  if (!l) return { ok: false, motivo: 'El código no tiene el formato de una licencia de CarteraPro.' };
  if (!subtle) return { ok: false, motivo: 'Este navegador no puede comprobar licencias. Abre la app desde su enlace https.' };
  try {
    const k = await subtle.importKey('jwk', clave, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const ok = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, k, l.firma, l.bytes);
    return ok ? { ok: true, datos: l.datos, texto: l.texto } : { ok: false, motivo: 'La licencia no es válida. Revisa que la copiaste completa.' };
  } catch {
    return { ok: false, motivo: 'La licencia no es válida. Revisa que la copiaste completa.' };
  }
}

/** Firma una licencia (lo usa el generador, que tiene la clave privada). */
export async function firmar(datos, clavePrivada, subtle = globalThis.crypto?.subtle) {
  const bytes = new TextEncoder().encode(JSON.stringify({ v: 1, ...datos }));
  const k = await subtle.importKey('jwk', clavePrivada, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const firma = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k, bytes);
  return `${PREFIJO}.${aBase64Url(bytes)}.${aBase64Url(firma)}`;
}

/** ¿Se puede crear un registro más? (los datos de demostración no cuentan). */
export function dentroDelLimite(tipo, registros) {
  const usados = registros.filter(r => !r.esDemo).length;
  return { ok: usados < LIMITES_PRUEBA[tipo], usados, limite: LIMITES_PRUEBA[tipo] };
}
