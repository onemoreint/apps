import { describe, expect, it } from 'vitest'
import { availableSlots, checkSlot, type AvailabilityInput } from './availability'
import type { Appointment, AvailabilityRule, ScheduleBlock } from '../types'

// Lunes 16-nov-2026, 9:00 a. m. en Bogotá (14:00 UTC)
const NOW = new Date('2026-11-16T14:00:00Z')
const rules: AvailabilityRule[] = [1, 2, 3, 4, 5, 6].flatMap((wd) => [
  { id: `a${wd}`, businessId: 'b', staffId: 's1', weekday: wd, startMin: 540, endMin: 780 },
  { id: `p${wd}`, businessId: 'b', staffId: 's1', weekday: wd, startMin: 840, endMin: 1140 },
])
const appt = (p: Partial<Appointment>): Appointment => ({
  id: 'x', businessId: 'b', clientId: 'c', serviceId: 'sv', staffId: 's1', date: '2026-11-17', startMin: 600, endMin: 660,
  status: 'confirmada', price: 1, clientNotes: '', internalNotes: '', source: 'admin', createdAt: '', updatedAt: '', ...p,
})
const base = (o: Partial<AvailabilityInput> = {}): AvailabilityInput => ({
  business: { slotStepMin: 30, minLeadMin: 60, maxDaysAhead: 45 },
  rules, blocks: [], appointments: [], staffId: 's1', date: '2026-11-17', durationMin: 60, now: NOW, ...o,
})

describe('motor de disponibilidad', () => {
  it('genera horarios dentro del horario de atención respetando la duración', () => {
    const s = availableSlots(base({ durationMin: 120 }))
    expect(s[0].startMin).toBe(540)
    expect(s.every((x) => (x.startMin >= 540 && x.endMin <= 780) || (x.startMin >= 840 && x.endMin <= 1140))).toBe(true)
    expect(s.find((x) => x.startMin === 720)).toBeUndefined() // 12:00 + 2h se pasa del almuerzo
  })
  it('excluye horarios que se solapan con citas activas, pero no con canceladas', () => {
    const busy = base({ appointments: [appt({})] })
    expect(checkSlot(busy, 600)).toBe('ocupado')
    expect(checkSlot(busy, 570)).toBe('ocupado') // 9:30–10:30 pisa 10:00–11:00
    expect(checkSlot(busy, 660)).toBeNull() // contigua
    expect(checkSlot(base({ appointments: [appt({ status: 'cancelada' })] }), 600)).toBeNull()
  })
  it('respeta bloqueos y días de descanso', () => {
    const block: ScheduleBlock = { id: 'b1', businessId: 'b', staffId: 's1', date: '2026-11-17', startMin: 540, endMin: 660, reason: '', kind: 'bloqueo' }
    expect(checkSlot(base({ blocks: [block] }), 600)).toBe('bloqueado')
    expect(checkSlot(base({ blocks: [{ ...block, kind: 'descanso', startMin: 0, endMin: 1440 }] }), 900)).toBe('dia_de_descanso')
  })
  it('rechaza domingos sin horario, fechas pasadas y fuera de rango', () => {
    expect(checkSlot(base({ date: '2026-11-22' }), 600)).toBe('sin_horario')
    expect(checkSlot(base({ date: '2026-11-15' }), 600)).toBe('fecha_pasada')
    expect(checkSlot(base({ date: '2027-03-01' }), 600)).toBe('fuera_de_rango')
  })
  it('exige anticipación mínima para reservas públicas el mismo día', () => {
    const t = base({ date: '2026-11-16' })
    expect(checkSlot(t, 570)).toBe('anticipacion') // 9:30 con ahora=9:00 y 60 min de margen
    expect(checkSlot(t, 600)).toBeNull()
    expect(checkSlot({ ...t, admin: true }, 570)).toBeNull()
  })
  it('aísla agendas por profesional', () => {
    expect(checkSlot(base({ appointments: [appt({ staffId: 's2' })] }), 600)).toBeNull()
  })
})
