import type { Appointment, LoyaltySettings, LoyaltyTransaction } from '../types'

export function clientPoints(tx: LoyaltyTransaction[], clientId: string): number {
  return tx.filter((t) => t.clientId === clientId).reduce((s, t) => s + t.points, 0)
}

/** Puntos netos que una cita tiene acreditados (acumulación − reversión). */
export function appointmentNetPoints(tx: LoyaltyTransaction[], appointmentId: string): number {
  return tx
    .filter((t) => t.appointmentId === appointmentId && (t.kind === 'acumulacion' || t.kind === 'reversion'))
    .reduce((s, t) => s + t.points, 0)
}

/**
 * Decide qué movimiento de puntos produce un cambio de estado.
 * - Solo una cita COMPLETADA genera puntos, una única vez.
 * - Si una cita completada pasa a otro estado (p. ej. cancelada por error), se revierten.
 */
export function loyaltyDeltaForStatus(
  settings: LoyaltySettings,
  tx: LoyaltyTransaction[],
  appt: Appointment,
): { points: number; kind: 'acumulacion' | 'reversion' } | null {
  const net = appointmentNetPoints(tx, appt.id)
  if (appt.status === 'completada') {
    if (!settings.enabled || net > 0 || settings.pointsPerVisit <= 0) return null
    return { points: settings.pointsPerVisit, kind: 'acumulacion' }
  }
  if (net > 0) return { points: -net, kind: 'reversion' }
  return null
}

export function loyaltyTier(points: number): { label: string; tone: 'ink' | 'rose' | 'champagne' } {
  if (points >= 300) return { label: 'Ángel Oro', tone: 'champagne' }
  if (points >= 100) return { label: 'Ángel Rosa', tone: 'rose' }
  return { label: 'Ángel', tone: 'ink' }
}
