/**
 * Traduce errores del servidor a mensajes para personas.
 * El detalle técnico va a la consola, nunca a la pantalla del cliente.
 */
export type ApiErrorCode =
  | 'TABLE_NOT_FOUND'
  | 'ITEMS_UNAVAILABLE'
  | 'INVALID_CART'
  | 'RATE_LIMITED'
  | 'NETWORK'
  | 'UNKNOWN';

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    public detail?: string,
  ) {
    super(code);
  }
}

const KNOWN: ApiErrorCode[] = ['TABLE_NOT_FOUND', 'ITEMS_UNAVAILABLE', 'INVALID_CART', 'RATE_LIMITED'];

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const e = err as { message?: string; details?: string; detail?: string } | null;
  const msg = e?.message ?? '';
  const known = KNOWN.find((k) => msg.includes(k));
  if (known) return new ApiError(known, e?.details ?? e?.detail);
  console.error('[MesaQR]', err);
  if (/fetch|network|Failed to fetch|NetworkError|Load failed/i.test(msg)) return new ApiError('NETWORK');
  return new ApiError('UNKNOWN');
}

export const CUSTOMER_MESSAGES: Record<ApiErrorCode, string> = {
  TABLE_NOT_FOUND: 'No pudimos identificar esta mesa.',
  ITEMS_UNAVAILABLE: 'Uno de los productos de tu pedido ya no está disponible. Lo quitamos del carrito.',
  INVALID_CART: 'Revisa tu pedido: falta elegir una opción o hay algo que no cuadra.',
  RATE_LIMITED: 'Se enviaron varios pedidos seguidos desde esta mesa. Espera un par de minutos.',
  NETWORK: 'Sin conexión. Revisa tu internet e intenta de nuevo.',
  UNKNOWN: 'Ocurrió un problema. Intenta nuevamente.',
};

/** Mensaje legible para el panel admin (errores de Supabase/PostgREST). */
export function adminMessage(err: unknown): string {
  const e = err as { message?: string; code?: string } | null;
  console.error('[MesaQR admin]', err);
  const msg = e?.message ?? '';
  if (e?.code === '23505') return 'Ya existe un registro con ese valor (por ejemplo, ese número de mesa).';
  if (e?.code === '23503') return 'No se puede borrar: otros datos dependen de este registro. Desactívalo en su lugar.';
  if (e?.code === '23514') return 'Algún dato no tiene el formato permitido. Revisa los campos.';
  if (e?.code === '42501' || /row-level security|permission/i.test(msg)) return 'No tienes permiso para esta acción.';
  if (/Invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.';
  if (/fetch|network/i.test(msg)) return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
  return 'Ocurrió un problema. Intenta nuevamente.';
}
