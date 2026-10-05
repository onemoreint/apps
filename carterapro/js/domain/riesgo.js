// Perfil administrativo interno. NO es una evaluación crediticia oficial:
// solo resume el comportamiento de pago registrado en esta app.
import { diferenciaDias } from '../core/dates.js';
import { saldoCuota } from './pagos.js';
import { diasAtraso } from './estados.js';

export const AVISO_RIESGO = 'Este indicador es únicamente una referencia administrativa y no constituye una evaluación crediticia oficial.';

export const NIVELES_RIESGO = {
  BUEN_HISTORIAL: { nombre: 'Buen historial', tono: 'verde', emoji: '🟢' },
  PRECAUCION: { nombre: 'Precaución', tono: 'amarillo', emoji: '🟡' },
  RIESGO: { nombre: 'Riesgo', tono: 'naranja', emoji: '🟠' },
  ALTO_RIESGO: { nombre: 'Alto riesgo', tono: 'rojo', emoji: '🔴' },
  SIN_HISTORIAL: { nombre: 'Sin historial suficiente', tono: 'gris', emoji: '⚪' },
};

/**
 * @param {{cuotas:object[], gracia:number}[]} creditos créditos no cancelados del cliente
 */
export function evaluarRiesgo(creditos, hoy) {
  let exigibles = 0, tarde = 0, vencidasHoy = 0, parciales = 0, maxAtraso = 0;

  for (const { cuotas, gracia = 0 } of creditos) {
    for (const c of cuotas) {
      if (diferenciaDias(c.fechaVencimiento, hoy) < 0) continue; // aún no vence
      exigibles++;
      const limite = gracia;
      if (saldoCuota(c) > 0) {
        const atraso = diasAtraso(c, hoy);
        if (atraso > limite) { vencidasHoy++; tarde++; maxAtraso = Math.max(maxAtraso, atraso); }
        if ((c.valorPagado || 0) > 0) parciales++;
      } else if (c.fechaPagoCompleto) {
        const atraso = diferenciaDias(c.fechaVencimiento, c.fechaPagoCompleto);
        if (atraso > limite) { tarde++; maxAtraso = Math.max(maxAtraso, atraso); }
      }
    }
  }

  const datos = { exigibles, tarde, vencidasHoy, parciales, maxAtraso };
  if (exigibles === 0) return { nivel: 'SIN_HISTORIAL', ...datos };
  // Con pocas cuotas el porcentaje es poco representativo: solo cuenta desde 4.
  const pctTarde = exigibles >= 4 ? tarde / exigibles : 0;
  let nivel = 'BUEN_HISTORIAL';
  if (vencidasHoy >= 3 || maxAtraso > 30) nivel = 'ALTO_RIESGO';
  else if (vencidasHoy >= 2 || maxAtraso > 15 || pctTarde > 0.4) nivel = 'RIESGO';
  else if (vencidasHoy >= 1 || pctTarde > 0.15 || parciales >= 2) nivel = 'PRECAUCION';
  return { nivel, pctTarde, ...datos };
}
