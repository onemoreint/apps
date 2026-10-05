// Fechas como texto 'YYYY-MM-DD' en hora local. Toda la aritmética se hace en UTC
// para evitar saltos por zona horaria u horario de verano.

const DIA_MS = 86400000;
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = MESES.map(m => m.slice(0, 3));

const pad = n => String(n).padStart(2, '0');

export function deDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function hoy() {
  return deDate(new Date());
}

export function esValida(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function aUTC(s) {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function deUTC(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function sumarDias(s, n) {
  return deUTC(aUTC(s) + n * DIA_MS);
}

/** Suma meses conservando el día ancla; si el mes es más corto, usa su último día. */
export function sumarMeses(s, n, diaAncla) {
  const [y, m, d] = s.split('-').map(Number);
  const ancla = diaAncla || d;
  const total = (m - 1) + n;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  const ultimo = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${pad(nm + 1)}-${pad(Math.min(ancla, ultimo))}`;
}

/** Días desde a hasta b (positivo si b es posterior). */
export function diferenciaDias(a, b) {
  return Math.round((aUTC(b) - aUTC(a)) / DIA_MS);
}

export function diaSemana(s) {
  return new Date(aUTC(s)).getUTCDay();
}

export function inicioMes(s) {
  return s.slice(0, 8) + '01';
}

export function finMes(s) {
  return sumarDias(sumarMeses(inicioMes(s), 1), -1);
}

export function inicioSemana(s) {
  const dia = diaSemana(s); // lunes como inicio
  return sumarDias(s, -((dia + 6) % 7));
}

let formato = 'DD/MM/YYYY';
export function setFormato(f) {
  formato = f || 'DD/MM/YYYY';
}

export function formatear(s) {
  if (!esValida(s)) return '—';
  const [y, m, d] = s.split('-');
  if (formato === 'MM/DD/YYYY') return `${m}/${d}/${y}`;
  if (formato === 'YYYY-MM-DD') return s;
  return `${d}/${m}/${y}`;
}

/** "lun 6 oct" */
export function corta(s) {
  if (!esValida(s)) return '—';
  const [, m, d] = s.split('-').map(Number);
  return `${DIAS_CORTOS[diaSemana(s)]} ${d} ${MESES_CORTOS[m - 1]}`;
}

/** "lunes, 5 de octubre de 2026" */
export function larga(s) {
  const nombres = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const [y, m, d] = s.split('-').map(Number);
  return `${nombres[diaSemana(s)]}, ${d} de ${MESES[m - 1]} de ${y}`;
}

/** Texto relativo: "hoy", "mañana", "en 3 días", "hace 2 días". */
export function relativa(s, referencia = hoy()) {
  const n = diferenciaDias(referencia, s);
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  if (n === -1) return 'ayer';
  return n > 0 ? `en ${n} días` : `hace ${-n} días`;
}
