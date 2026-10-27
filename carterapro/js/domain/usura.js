// Tasa efectiva anual de un crédito, para compararla con el tope legal (usura) que defina el usuario.
// Se calcula la tasa interna de retorno diaria del plan de pagos y se lleva a efectivo anual.
import { diferenciaDias } from '../core/dates.js';

/**
 * @param {number} desembolso dinero entregado (unidad mínima)
 * @param {string} fechaInicio 'YYYY-MM-DD'
 * @param {{fechaVencimiento:string, valorProgramado:number}[]} cuotas
 * @returns {number|null} fracción efectiva anual (0.25 = 25 % E.A.), o null si no aplica
 */
export function tasaEfectivaAnual(desembolso, fechaInicio, cuotas) {
  if (!(desembolso > 0) || !cuotas?.length) return null;
  const flujos = cuotas.map(c => ({ t: Math.max(1, diferenciaDias(fechaInicio, c.fechaVencimiento)), v: c.valorProgramado }));
  const total = flujos.reduce((s, f) => s + f.v, 0);
  if (total <= desembolso) return 0;
  // Valor presente con tasa diaria r: sum v / (1+r)^t. Es decreciente en r; se busca VP = desembolso.
  const vp = r => flujos.reduce((s, f) => s + f.v / (1 + r) ** f.t, 0);
  let bajo = 0, alto = 0.05;
  while (vp(alto) > desembolso && alto < 10) alto *= 2;
  for (let i = 0; i < 80; i++) {
    const medio = (bajo + alto) / 2;
    if (vp(medio) > desembolso) bajo = medio; else alto = medio;
  }
  const diaria = (bajo + alto) / 2;
  const ea = (1 + diaria) ** 365 - 1;
  return Number.isFinite(ea) ? ea : Infinity;
}

/** Compara contra el tope (porcentaje E.A. escrito por el usuario, p. ej. 26.5). */
export function evaluarUsura(ea, topePorcentaje) {
  if (ea == null) return { estado: 'NA' };
  const tope = Number(topePorcentaje);
  if (!(tope > 0)) return { estado: 'SIN_TOPE', ea };
  return { estado: ea * 100 > tope ? 'EXCEDE' : 'OK', ea, tope };
}
