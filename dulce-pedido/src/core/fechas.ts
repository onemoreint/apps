/**
 * Reglas de fechas de entrega. Las mismas reglas se aplican en el servidor
 * (función dp_crear_pedido); aquí solo sirven para guiar al cliente.
 * Todas las fechas son texto "AAAA-MM-DD" en la hora local del negocio.
 */

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function aUTC(fecha: string): Date {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a!, (m ?? 1) - 1, d ?? 1));
}

function aTexto(f: Date): string {
  return f.toISOString().slice(0, 10);
}

export function sumarDias(fecha: string, dias: number): string {
  const f = aUTC(fecha);
  f.setUTCDate(f.getUTCDate() + dias);
  return aTexto(f);
}

export function diaSemana(fecha: string): number {
  return aUTC(fecha).getUTCDay();
}

/** "sábado 7 de noviembre" */
export function fechaLarga(fecha: string): string {
  const f = aUTC(fecha);
  return `${DIAS[f.getUTCDay()]} ${f.getUTCDate()} de ${MESES[f.getUTCMonth()]}`;
}

export function esFechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  return aTexto(aUTC(fecha)) === fecha;
}

/** "AAAA-MM-DDTHH:mm" en una zona horaria (por defecto Colombia). */
export function ahoraEn(zona = 'America/Bogota', fecha = new Date()): string {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? '00';
  return `${v('year')}-${v('month')}-${v('day')}T${v('hour')}:${v('minute')}`;
}

export type ReglasFecha = {
  /** Hora local "AAAA-MM-DDTHH:mm". */
  ahora: string;
  /** Horas de preparación del producto más demorado del carrito. */
  horasPreparacion: number;
  diasAtencion: number[];
  diasMaxAnticipacion: number;
  bloqueadas: string[];
};

/** Primera fecha posible solo por tiempo de preparación (sin mirar días de atención). */
export function fechaMinimaPorPreparacion(ahora: string, horas: number): string {
  const [fecha, hora = '00:00'] = ahora.split('T');
  const [h, m] = hora.split(':').map(Number);
  const minutos = (h ?? 0) * 60 + (m ?? 0) + Math.max(0, horas) * 60;
  return sumarDias(fecha!, Math.floor(minutos / (24 * 60)));
}

export type MotivoFecha = 'pasada' | 'preparacion' | 'muy_lejana' | 'cerrado' | 'bloqueada' | 'invalida';

export const MENSAJE_FECHA: Record<MotivoFecha, string> = {
  invalida: 'Elige una fecha válida.',
  pasada: 'Esa fecha ya pasó.',
  preparacion: 'No alcanzamos a prepararlo para esa fecha. Elige una fecha posterior.',
  muy_lejana: 'Todavía no recibimos pedidos para esa fecha.',
  cerrado: 'Ese día no atendemos.',
  bloqueada: 'Esa fecha no está disponible.',
};

/** null = la fecha cumple las reglas (no significa que esté reservada: la vendedora confirma). */
export function revisarFecha(fecha: string, r: ReglasFecha): MotivoFecha | null {
  if (!esFechaValida(fecha)) return 'invalida';
  const hoy = r.ahora.slice(0, 10);
  if (fecha < hoy) return 'pasada';
  if (fecha < fechaMinimaPorPreparacion(r.ahora, r.horasPreparacion)) return 'preparacion';
  if (fecha > sumarDias(hoy, r.diasMaxAnticipacion)) return 'muy_lejana';
  if (r.diasAtencion.length > 0 && !r.diasAtencion.includes(diaSemana(fecha))) return 'cerrado';
  if (r.bloqueadas.includes(fecha)) return 'bloqueada';
  return null;
}

/** Fechas elegibles, en orden, para mostrar como opciones rápidas. */
export function fechasDisponibles(r: ReglasFecha, maximo = 60): string[] {
  const hoy = r.ahora.slice(0, 10);
  const res: string[] = [];
  for (let i = 0; i <= r.diasMaxAnticipacion && res.length < maximo; i++) {
    const f = sumarDias(hoy, i);
    if (revisarFecha(f, r) === null) res.push(f);
  }
  return res;
}

/** "24 horas", "2 días", "Para hoy". */
export function textoPreparacion(horas: number): string {
  if (horas <= 0) return 'Disponible para hoy';
  if (horas < 24) return `${horas} ${horas === 1 ? 'hora' : 'horas'} de preparación`;
  const dias = Math.ceil(horas / 24);
  return `${dias} ${dias === 1 ? 'día' : 'días'} de anticipación`;
}

export function nombreDia(n: number): string {
  return DIAS[n] ?? '';
}
