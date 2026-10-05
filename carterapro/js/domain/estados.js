// Estados calculados (nunca se guardan): dependen de la fecha de hoy y de los pagos.
import { diferenciaDias } from '../core/dates.js';
import { saldoCuota, saldoCapitalCuota } from './pagos.js';

export const DIAS_PROXIMO = 3;

/** Estados visuales comunes a toda la app. */
export const ESTADOS = {
  AL_DIA: { nombre: 'Al día', tono: 'verde', emoji: '🟢' },
  PROXIMO: { nombre: 'Próximo', tono: 'amarillo', emoji: '🟡' },
  PENDIENTE: { nombre: 'Pendiente', tono: 'naranja', emoji: '🟠' },
  VENCIDO: { nombre: 'Vencido', tono: 'rojo', emoji: '🔴' },
  PAGADO: { nombre: 'Pagado', tono: 'azul', emoji: '🔵' },
  CANCELADO: { nombre: 'Cancelado', tono: 'gris', emoji: '⚪' },
  SIN_CREDITOS: { nombre: 'Sin créditos', tono: 'gris', emoji: '⚪' },
};

/** Días de atraso desde el vencimiento (0 si no está atrasada o ya se pagó). */
export function diasAtraso(cuota, hoy) {
  if (saldoCuota(cuota) <= 0) return 0;
  return Math.max(0, diferenciaDias(cuota.fechaVencimiento, hoy));
}

/** Estado técnico de la cuota: PAGADA | VENCIDA | PARCIAL | PENDIENTE. */
export function estadoCuota(cuota, hoy, diasGracia = 0) {
  if (saldoCuota(cuota) <= 0) return 'PAGADA';
  if (diferenciaDias(cuota.fechaVencimiento, hoy) > diasGracia) return 'VENCIDA';
  return (cuota.valorPagado || 0) > 0 ? 'PARCIAL' : 'PENDIENTE';
}

/** Estado visual de una cuota. */
export function estadoVisualCuota(cuota, hoy, diasGracia = 0) {
  const e = estadoCuota(cuota, hoy, diasGracia);
  if (e === 'PAGADA') return 'PAGADO';
  if (e === 'VENCIDA') return 'VENCIDO';
  if (diferenciaDias(hoy, cuota.fechaVencimiento) <= DIAS_PROXIMO) return 'PROXIMO';
  if (e === 'PARCIAL') return 'PENDIENTE';
  return 'AL_DIA';
}

/** Resumen numérico y de estado de un crédito a partir de sus cuotas. */
export function resumenCredito(credito, cuotas, hoy) {
  const gracia = credito.diasGracia || 0;
  const ordenadas = [...cuotas].sort((a, b) => a.numero - b.numero);
  let saldoTotal = 0, saldoCapital = 0, pagadoCapital = 0, pagadoInteres = 0;
  let cuotasPagadas = 0, vencidas = 0, montoVencido = 0, maxAtraso = 0;
  let proxima = null;

  for (const c of ordenadas) {
    const s = saldoCuota(c);
    saldoTotal += s;
    saldoCapital += saldoCapitalCuota(c);
    pagadoCapital += c.pagadoCapital || 0;
    pagadoInteres += c.pagadoInteres || 0;
    if (s <= 0) { cuotasPagadas++; continue; }
    if (!proxima) proxima = c;
    if (estadoCuota(c, hoy, gracia) === 'VENCIDA') {
      vencidas++;
      montoVencido += s;
      maxAtraso = Math.max(maxAtraso, diasAtraso(c, hoy));
    }
  }

  const totalPagado = pagadoCapital + pagadoInteres;
  let estado;
  if (credito.cancelado) estado = 'CANCELADO';
  else if (saldoTotal <= 0) estado = 'PAGADO';
  else if (vencidas > 0) estado = 'VENCIDO';
  else estado = 'ACTIVO';

  let visual;
  if (estado === 'CANCELADO') visual = 'CANCELADO';
  else if (estado === 'PAGADO') visual = 'PAGADO';
  else if (estado === 'VENCIDO') visual = 'VENCIDO';
  else if (proxima && diferenciaDias(hoy, proxima.fechaVencimiento) <= DIAS_PROXIMO) visual = 'PROXIMO';
  else visual = 'AL_DIA';

  return {
    estado, visual, saldoTotal, saldoCapital, pagadoCapital, pagadoInteres, totalPagado,
    cuotasPagadas, totalCuotas: ordenadas.length, vencidas, montoVencido, maxAtraso, proxima,
    progreso: credito.totalAPagar ? totalPagado / credito.totalAPagar : 0,
    fechaUltimoVencimiento: ordenadas.at(-1)?.fechaVencimiento,
  };
}

const PRIORIDAD = ['VENCIDO', 'PROXIMO', 'PENDIENTE', 'AL_DIA', 'PAGADO', 'CANCELADO', 'SIN_CREDITOS'];

/** El estado más urgente entre varios (para clientes con varios créditos). */
export function peorEstado(visuales) {
  if (!visuales.length) return 'SIN_CREDITOS';
  return PRIORIDAD.find(e => visuales.includes(e)) || 'AL_DIA';
}
