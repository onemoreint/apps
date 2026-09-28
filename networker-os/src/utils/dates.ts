// Utilidades de fecha. Todas las funciones del motor reciben `now` para ser deterministas y testeables.

const DAY = 86_400_000;

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function daysBetween(fromIso: string | null | undefined, now: Date): number {
  if (!fromIso) return Infinity;
  const a = startOfDay(new Date(fromIso)).getTime();
  const b = startOfDay(now).getTime();
  return Math.round((b - a) / DAY);
}

export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isoAtDaysFrom(now: Date, n: number, hour = 10): string {
  const d = startOfDay(addDays(now, n));
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export function mondayOf(d: Date): Date {
  const s = startOfDay(d);
  const dow = (s.getDay() + 6) % 7; // lunes = 0
  return addDays(s, -dow);
}

export function relativeDay(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return 'sin registro';
  const d = daysBetween(iso, now);
  if (d === 0) return 'hoy';
  if (d === 1) return 'ayer';
  if (d === -1) return 'mañana';
  if (d < 0) return `en ${-d} días`;
  if (d < 7) return `hace ${d} días`;
  if (d < 30) {
    const w = Math.floor(d / 7);
    return w === 1 ? 'hace 1 semana' : `hace ${w} semanas`;
  }
  const m = Math.floor(d / 30);
  return m === 1 ? 'hace 1 mes' : `hace ${m} meses`;
}

export function dueLabel(iso: string, now: Date = new Date()): string {
  const d = -daysBetween(iso, now);
  if (d < 0) return d === -1 ? 'Vencida desde ayer' : `Vencida hace ${-d} días`;
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  return `En ${d} días`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
