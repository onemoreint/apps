// Motor de disponibilidad (puro, sin efectos). Lo usan el adaptador demo y la UI.
// En producción, la función SQL `book_appointment` repite estas validaciones dentro
// de una transacción y la restricción EXCLUDE impide solapamientos de forma atómica.
import type { Appointment, AvailabilityRule, Business, ScheduleBlock, Service } from '../types'
import { BLOCKING_STATUSES } from '../types'
import { addDays, diffDays, minutesNow, overlaps, today, weekday } from './time'

export interface Slot {
  startMin: number
  endMin: number
}

export interface AvailabilityInput {
  business: Pick<Business, 'slotStepMin' | 'minLeadMin' | 'maxDaysAhead'>
  rules: AvailabilityRule[]
  blocks: ScheduleBlock[]
  appointments: Appointment[]
  staffId: string
  date: string
  durationMin: number
  now?: Date
  /** Ignorar esta cita (al reprogramar). */
  excludeAppointmentId?: string
  /** El panel admin puede saltarse la anticipación mínima y el límite de días. */
  admin?: boolean
}

export type Unavailability =
  | 'fecha_pasada'
  | 'fuera_de_rango'
  | 'dia_de_descanso'
  | 'sin_horario'
  | 'fuera_de_horario'
  | 'bloqueado'
  | 'ocupado'
  | 'anticipacion'

export const UNAVAILABILITY_MSG: Record<Unavailability, string> = {
  fecha_pasada: 'La fecha ya pasó.',
  fuera_de_rango: 'La fecha está fuera del rango de reservas permitido.',
  dia_de_descanso: 'Ese día el salón no atiende.',
  sin_horario: 'No hay horario de atención configurado para ese día.',
  fuera_de_horario: 'El servicio no cabe dentro del horario de atención.',
  bloqueado: 'Ese horario está bloqueado.',
  ocupado: 'Ese horario ya está reservado.',
  anticipacion: 'Ese horario está demasiado próximo; elige uno más tarde.',
}

function dayRules(rules: AvailabilityRule[], staffId: string, date: string) {
  const wd = weekday(date)
  return rules.filter((r) => r.staffId === staffId && r.weekday === wd).sort((a, b) => a.startMin - b.startMin)
}

function dayBlocks(blocks: ScheduleBlock[], staffId: string, date: string) {
  return blocks.filter((b) => b.date === date && (b.staffId === null || b.staffId === staffId))
}

function isFullDayOff(blocks: ScheduleBlock[]) {
  return blocks.some((b) => b.kind === 'descanso' || (b.startMin <= 0 && b.endMin >= 1440))
}

/** Valida un horario concreto. Devuelve null si está disponible o el motivo si no. */
export function checkSlot(input: AvailabilityInput, startMin: number): Unavailability | null {
  const { business, staffId, date, durationMin, admin } = input
  const now = input.now ?? new Date()
  const t = today(now)
  const endMin = startMin + durationMin
  const dd = diffDays(t, date)
  if (dd < 0) return 'fecha_pasada'
  if (!admin && dd > business.maxDaysAhead) return 'fuera_de_rango'

  const blocks = dayBlocks(input.blocks, staffId, date)
  if (isFullDayOff(blocks)) return 'dia_de_descanso'

  const rules = dayRules(input.rules, staffId, date)
  if (!rules.length) return 'sin_horario'
  if (!rules.some((r) => startMin >= r.startMin && endMin <= r.endMin)) return 'fuera_de_horario'

  if (dd === 0) {
    const lead = admin ? 0 : business.minLeadMin
    if (startMin < minutesNow(now) + lead) return admin ? 'fecha_pasada' : 'anticipacion'
  }

  if (blocks.some((b) => overlaps(startMin, endMin, b.startMin, b.endMin))) return 'bloqueado'

  const busy = input.appointments.some(
    (a) =>
      a.id !== input.excludeAppointmentId &&
      a.staffId === staffId &&
      a.date === date &&
      BLOCKING_STATUSES.includes(a.status) &&
      overlaps(startMin, endMin, a.startMin, a.endMin),
  )
  if (busy) return 'ocupado'
  return null
}

/** Lista los horarios disponibles de un día para una duración dada. */
export function availableSlots(input: AvailabilityInput): Slot[] {
  const rules = dayRules(input.rules, input.staffId, input.date)
  const step = input.business.slotStepMin
  const out: Slot[] = []
  const seen = new Set<number>()
  for (const r of rules) {
    for (let s = r.startMin; s + input.durationMin <= r.endMin; s += step) {
      if (seen.has(s)) continue
      seen.add(s)
      if (checkSlot(input, s) === null) out.push({ startMin: s, endMin: s + input.durationMin })
    }
  }
  return out.sort((a, b) => a.startMin - b.startMin)
}

/** Próximos horarios libres a partir de hoy (para el dashboard). */
export function nextAvailable(
  base: Omit<AvailabilityInput, 'date'>,
  limit = 5,
  horizonDays = 14,
): { date: string; slot: Slot }[] {
  const now = base.now ?? new Date()
  const out: { date: string; slot: Slot }[] = []
  for (let i = 0; i <= horizonDays && out.length < limit; i++) {
    const date = addDays(today(now), i)
    for (const slot of availableSlots({ ...base, date, now })) {
      out.push({ date, slot })
      if (out.length >= limit) break
    }
  }
  return out
}

/** Días hábiles con al menos un horario libre (para el calendario público). */
export function isDayBookable(input: Omit<AvailabilityInput, 'date'>, date: string): boolean {
  return availableSlots({ ...input, date }).length > 0
}

export function serviceDuration(services: Service[], serviceId: string): number {
  return services.find((s) => s.id === serviceId)?.durationMin ?? 60
}
