import { logger } from './logger'

/**
 * Error de dominio con una clave de traducción para el usuario.
 * El detalle técnico va al logger, nunca a la pantalla.
 */
export class AppError extends Error {
  constructor(
    public readonly userMessageKey: string,
    public readonly cause?: unknown,
  ) {
    super(userMessageKey)
    this.name = 'AppError'
  }
}

/** Convierte cualquier error en una clave de mensaje amigable y lo registra. */
export function toUserMessageKey(error: unknown, fallbackKey = 'errors.generic'): string {
  if (error instanceof AppError) {
    if (error.cause) logger.error(error.userMessageKey, error.cause)
    return error.userMessageKey
  }
  logger.error(fallbackKey, error)
  return fallbackKey
}
