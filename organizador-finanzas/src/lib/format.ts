import type { Ajustes } from './finance';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** "excel" = como el original ($3,240,410.00). "co" = Colombia ($ 3.240.410). */
export function dinero(n: number, formato: Ajustes['formato'] = 'excel') {
  const neg = n < 0;
  const a = Math.abs(n);
  const s =
    formato === 'co'
      ? '$ ' + a.toLocaleString('es-CO', { maximumFractionDigits: 0 })
      : '$' + a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return neg ? '-' + s : s;
}

/** Valor corto para ejes de gráficos: 1,2 M · 450 k */
export function corto(n: number) {
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  if (a >= 1e3) return `${Math.round(n / 1e3)} k`;
  return String(Math.round(n));
}

/** d/mm/aaaa como en el registro del Excel */
export function fechaExcel(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${Number(d)}/${m}/${y}`;
}

/** 15-Mar como en el eje del gráfico diario */
export function diaMes(iso: string) {
  const [, m, d] = iso.split('-');
  return `${Number(d)}-${MESES_CORTOS[Number(m) - 1]}`;
}

export function nombreMes(mes: string, conAnio = true) {
  const [y, m] = mes.split('-');
  const n = MESES[Number(m) - 1] ?? mes;
  return conAnio ? `${n} ${y}` : n;
}

export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
