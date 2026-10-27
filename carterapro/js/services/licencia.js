// Estado de la licencia en este dispositivo: versión de prueba o versión completa.
import { verificar, LIMITES_PRUEBA, BLOQUEADO_EN_PRUEBA, dentroDelLimite } from '../domain/licencia.js';
import { ErrorNegocio } from '../domain/errores.js';
import { emit } from '../core/events.js';
import * as config from './config.js';

let estado = { modo: 'PRUEBA', datos: null };

/** En el computador del desarrollador (localhost) la app funciona completa para poder probarla. */
function esDesarrollo() {
  try {
    const local = ['localhost', '127.0.0.1'].includes(globalThis.location?.hostname);
    return local && globalThis.localStorage?.getItem('carterapro-forzar-prueba') !== '1';
  } catch {
    return false;
  }
}

export async function cargar() {
  const guardada = config.get().licencia;
  if (guardada) {
    const r = await verificar(guardada);
    if (r.ok) { estado = { modo: 'COMPLETA', datos: r.datos }; emit('licencia:cambio', estado); return estado; }
  }
  estado = esDesarrollo() ? { modo: 'COMPLETA', datos: { n: 'Modo desarrollo', id: 'DEV' }, desarrollo: true } : { modo: 'PRUEBA', datos: null };
  emit('licencia:cambio', estado);
  return estado;
}

export const get = () => estado;
export const esCompleta = () => estado.modo === 'COMPLETA';

/** Activa una licencia pegada o recibida por enlace. */
export async function activar(texto) {
  const r = await verificar(texto);
  if (!r.ok) throw new ErrorNegocio('LICENCIA_INVALIDA', r.motivo);
  await config.guardar({ licencia: r.texto, licenciaActivadaEn: new Date().toISOString() });
  estado = { modo: 'COMPLETA', datos: r.datos };
  emit('licencia:cambio', estado);
  return r.datos;
}

/** Lanza un error amable si la acción no está disponible en la versión de prueba. */
export function exigir(accion) {
  if (esCompleta()) return;
  throw new ErrorNegocio('LICENCIA_REQUERIDA', `Esta función (${BLOQUEADO_EN_PRUEBA[accion].toLowerCase()}) es parte de la versión completa. Actívala en Más → Activar licencia.`);
}

/** Lanza un error amable si se llegó al límite de la versión de prueba. */
export function exigirLimite(tipo, registros) {
  if (esCompleta()) return;
  const r = dentroDelLimite(tipo, registros);
  if (!r.ok) {
    throw new ErrorNegocio('LIMITE_PRUEBA', `La versión de prueba permite hasta ${r.limite} ${tipo}. Activa la versión completa en Más → Activar licencia para registrar más.`);
  }
}

export { LIMITES_PRUEBA };
