// Indicadores del dashboard. Siempre se calculan con los datos reales del adaptador activo.
import type { Appointment, DataSnapshot, Payment } from '../types'
import { addDays, startOfMonth, startOfWeek, today } from './time'
import { nextAvailable } from './availability'

export type Period = 'dia' | 'semana' | 'mes'

export function periodRange(period: Period, ref: string): [string, string] {
  if (period === 'dia') return [ref, ref]
  if (period === 'semana') {
    const s = startOfWeek(ref)
    return [s, addDays(s, 6)]
  }
  const s = startOfMonth(ref)
  const [y, m] = ref.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return [s, `${ref.slice(0, 8)}${String(last).padStart(2, '0')}`]
}

const inRange = (d: string, [a, b]: [string, string]) => d >= a && d <= b

export function paidForAppointment(payments: Payment[], appointmentId: string): number {
  return payments.filter((p) => p.appointmentId === appointmentId).reduce((s, p) => s + p.amount, 0)
}

export type PaymentState = 'sin_pago' | 'anticipo' | 'pagado' | 'sin_precio'

export function paymentState(appt: Appointment, payments: Payment[]): { state: PaymentState; paid: number; balance: number | null } {
  const paid = paidForAppointment(payments, appt.id)
  if (appt.price === null) return { state: paid > 0 ? 'anticipo' : 'sin_precio', paid, balance: null }
  const balance = Math.max(appt.price - paid, 0)
  if (paid <= 0) return { state: 'sin_pago', paid, balance }
  if (balance > 0) return { state: 'anticipo', paid, balance }
  return { state: 'pagado', paid, balance: 0 }
}

export function incomeReport(payments: Payment[], period: Period, ref: string) {
  const range = periodRange(period, ref)
  const list = payments.filter((p) => inRange(p.paidAt, range))
  const byMethod: Record<string, number> = {}
  const byDay: Record<string, number> = {}
  for (const p of list) {
    byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount
    byDay[p.paidAt] = (byDay[p.paidAt] ?? 0) + p.amount
  }
  return { range, total: list.reduce((s, p) => s + p.amount, 0), count: list.length, byMethod, byDay, list }
}

export function dashboardMetrics(data: DataSnapshot, now: Date = new Date()) {
  const t = today(now)
  const month = periodRange('mes', t)
  const appts = data.appointments
  const todays = appts.filter((a) => a.date === t && a.status !== 'cancelada').sort((a, b) => a.startMin - b.startMin)
  const pending = appts.filter((a) => a.status === 'pendiente' && a.date >= t)
  const completedMonth = appts.filter((a) => a.status === 'completada' && inRange(a.date, month))
  const cancelledMonth = appts.filter((a) => a.status === 'cancelada' && inRange(a.date, month))
  const income = incomeReport(data.payments, 'mes', t)

  const serviceCount = new Map<string, number>()
  for (const a of appts) {
    if (a.status === 'cancelada') continue
    serviceCount.set(a.serviceId, (serviceCount.get(a.serviceId) ?? 0) + 1)
  }
  const topServices = [...serviceCount.entries()]
    .map(([id, count]) => ({ service: data.services.find((s) => s.id === id), count }))
    .filter((x) => x.service)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)

  const visits = new Map<string, number>()
  for (const a of appts) if (a.status === 'completada') visits.set(a.clientId, (visits.get(a.clientId) ?? 0) + 1)
  const recurring = [...visits.entries()]
    .filter(([, n]) => n >= 2)
    .map(([id, n]) => ({ client: data.clients.find((c) => c.id === id), visits: n }))
    .filter((x) => x.client && !x.client.anonymized)
    .sort((a, b) => b.visits - a.visits)

  const staff = data.staff.find((s) => s.active)
  const shortest = Math.min(...data.services.filter((s) => s.active).map((s) => s.durationMin), 60)
  const nextSlots = staff
    ? nextAvailable({
        business: data.business,
        rules: data.availability,
        blocks: data.blocks,
        appointments: appts,
        staffId: staff.id,
        durationMin: shortest,
        now,
      })
    : []

  return { today: t, todays, pending, completedMonth, cancelledMonth, income, topServices, recurring, nextSlots, shortest }
}

export function clientStats(data: DataSnapshot, clientId: string, now: Date = new Date()) {
  const t = today(now)
  const appts = data.appointments.filter((a) => a.clientId === clientId).sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin)
  const completed = appts.filter((a) => a.status === 'completada')
  const totalPaid = data.payments.filter((p) => p.clientId === clientId).reduce((s, p) => s + p.amount, 0)
  const lastVisit = completed.length ? completed[completed.length - 1] : undefined
  const next = appts.find((a) => a.date >= t && (a.status === 'pendiente' || a.status === 'confirmada'))
  const servicesDone = [...new Set(completed.map((a) => a.serviceId))]
  return { appts, completed, totalPaid, lastVisit, next, servicesDone }
}
