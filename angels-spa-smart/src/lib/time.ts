// Utilidades de fecha y hora en la zona del negocio (America/Bogota, UTC-5 sin horario de verano).
export const TZ = 'America/Bogota'

const pad = (n: number) => String(n).padStart(2, '0')

/** Fecha 'YYYY-MM-DD' de un Date, vista en la zona del negocio. */
export function toISODate(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  return parts // en-CA ya produce YYYY-MM-DD
}

/** Minutos desde medianoche, en la zona del negocio. */
export function minutesNow(d: Date = new Date()): number {
  const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
    .format(d)
    .split(':')
    .map(Number)
  return (h % 24) * 60 + m
}

export function today(now: Date = new Date()): string {
  return toISODate(now)
}

/** Interpreta 'YYYY-MM-DD' como fecha de calendario (al mediodía UTC para evitar desfases). */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12))
}

export function addDays(iso: string, days: number): string {
  const d = parseDate(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function weekday(iso: string): number {
  return parseDate(iso).getUTCDay()
}

export function startOfWeek(iso: string): string {
  // Semana de lunes a domingo
  const wd = weekday(iso)
  return addDays(iso, wd === 0 ? -6 : 1 - wd)
}

export function startOfMonth(iso: string): string {
  return iso.slice(0, 8) + '01'
}

export function daysInMonth(iso: string): number {
  const [y, m] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000)
}

export function minToHHMM(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`
}

export function hhmmToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** 14:30 → "2:30 p. m." */
export function formatTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${pad(m)} ${h < 12 ? 'a. m.' : 'p. m.'}`
}

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export const weekdayName = (wd: number) => WEEKDAYS[wd]
export const weekdayShort = (wd: number) => WEEKDAYS_SHORT[wd]
export const monthName = (m: number) => MONTHS[m]

/** "lunes 16 de noviembre" */
export function formatDateLong(iso: string): string {
  const d = parseDate(iso)
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`
}

/** "16 nov 2026" */
export function formatDateShort(iso: string): string {
  const d = parseDate(iso)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`
}

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}
