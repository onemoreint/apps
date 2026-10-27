// Manejo de errores: el usuario nunca ve mensajes técnicos y la app nunca queda bloqueada.
import { toast } from '../ui/dialogos.js';

export function mensajeAmigable(e, contexto) {
  if (e?.name === 'ErrorNegocio') return e.message;
  if (e?.name === 'QuotaExceededError') return 'El dispositivo no tiene espacio suficiente. Libera espacio y vuelve a intentarlo.';
  if (e?.name === 'ConstraintError') return 'Ya existe un registro con ese número. Vuelve a intentarlo.';
  return contexto
    ? `Ha ocurrido un problema al ${contexto}. Tus datos no se han perdido.`
    : 'Ocurrió un problema inesperado. Tus datos no se han perdido.';
}

/** Ejecuta una acción mostrando un mensaje amigable si falla, con opción de reintentar. */
export async function intentar(fn, contexto) {
  try {
    return await fn();
  } catch (e) {
    if (e?.name !== 'ErrorNegocio') console.error(e);
    const licencia = ['LIMITE_PRUEBA', 'LICENCIA_REQUERIDA'].includes(e?.codigo);
    toast(mensajeAmigable(e, contexto), licencia ? 'info' : 'error', {
      accion: licencia ? { texto: 'Activar', fn: () => { location.hash = '#/activar'; } }
        : e?.name === 'ErrorNegocio' ? null : { texto: 'Reintentar', fn: () => intentar(fn, contexto) },
      duracion: licencia ? 9000 : 6000,
    });
    if (e && typeof e === 'object') e.__manejado = true;
    throw e;
  }
}

export function instalarCapturaGlobal() {
  window.addEventListener('error', e => {
    console.error(e.error || e.message);
    toast(mensajeAmigable(e.error), 'error');
  });
  window.addEventListener('unhandledrejection', e => {
    if (e.reason?.__manejado) return;
    console.error(e.reason);
    toast(mensajeAmigable(e.reason), 'error');
  });
}
