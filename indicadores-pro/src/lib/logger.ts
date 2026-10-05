/**
 * Registro técnico de errores. La interfaz nunca muestra estos detalles:
 * muestra mensajes amigables (ver AppError.userMessageKey).
 * En una etapa posterior este logger enviará los eventos a un servicio externo.
 */
type Level = 'info' | 'warn' | 'error'

function emit(level: Level, message: string, context?: unknown) {
  if (import.meta.env.MODE === 'test') return
  const entry = { level, message, context, at: new Date().toISOString() }
  // eslint-disable-next-line no-console
  console[level === 'info' ? 'log' : level](`[indicadores-pro] ${message}`, entry)
}

export const logger = {
  info: (m: string, c?: unknown) => emit('info', m, c),
  warn: (m: string, c?: unknown) => emit('warn', m, c),
  error: (m: string, c?: unknown) => emit('error', m, c),
}
