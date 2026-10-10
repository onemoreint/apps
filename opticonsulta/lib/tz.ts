// Conversión entre hora local de la óptica y UTC sin dependencias.
// La base guarda timestamptz (UTC); la interfaz trabaja en la zona de la organización.

function partsInZone(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });
  const map = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: map.weekday as string,
  };
}

/** Diferencia en milisegundos entre la hora local de la zona y UTC en ese instante. */
function offsetMs(date: Date, timeZone: string): number {
  const p = partsInZone(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

/** "2026-11-02" + "09:30" en America/Bogota → instante UTC. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const d = DATE_RE.exec(date);
  const t = TIME_RE.exec(time);
  if (!d || !t) throw new Error(`Fecha u hora no válida: ${date} ${time}`);
  const guess = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]));
  const first = offsetMs(new Date(guess), timeZone);
  let result = guess - first;
  const second = offsetMs(new Date(result), timeZone);
  if (second !== first) result = guess - second;
  return new Date(result);
}

/** Fecha (YYYY-MM-DD) y hora (HH:mm) locales de un instante. */
export function utcToZoned(iso: string | Date, timeZone: string): { date: string; time: string; weekday: string } {
  const p = partsInZone(typeof iso === "string" ? new Date(iso) : iso, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}`, weekday: p.weekday };
}

export function todayIn(timeZone: string): string {
  return utcToZoned(new Date(), timeZone).date;
}

/** Suma días a una fecha de calendario (sin horas ni zonas). */
export function addDays(date: string, days: number): string {
  const d = DATE_RE.exec(date);
  if (!d) throw new Error(`Fecha no válida: ${date}`);
  const t = new Date(Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]) + days));
  return t.toISOString().slice(0, 10);
}

/** Día de la semana de una fecha de calendario: 0 = lunes … 6 = domingo. */
export function weekdayIndex(date: string): number {
  const d = DATE_RE.exec(date);
  if (!d) throw new Error(`Fecha no válida: ${date}`);
  return (new Date(Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]))).getUTCDay() + 6) % 7;
}

export function isValidDate(value: string): boolean {
  const d = DATE_RE.exec(value);
  if (!d) return false;
  const t = new Date(Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3])));
  return t.toISOString().slice(0, 10) === value;
}
