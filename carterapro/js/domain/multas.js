// Multas por mora. Funciones puras: calculan, no guardan.
// Una multa se "aplica" cuando se guarda como cargo; así queda fija aunque cambie la política después.
import { estadoCuota, diasAtraso } from './estados.js';

export const TIPOS_MULTA = {
  NINGUNA: { nombre: 'Sin multa', explicacion: 'No se cobra recargo por atraso.' },
  FIJA: { nombre: 'Valor fijo por cuota vencida', explicacion: 'Se cobra una sola vez por cada cuota que pase la fecha (y los días de gracia).' },
  DIARIA: { nombre: 'Valor por día de atraso', explicacion: 'Se cobra por cada día de atraso de cada cuota, hasta el tope que definas.' },
};

/** Política vacía (crédito sin multa). */
export const SIN_MULTA = { tipo: 'NINGUNA', valor: 0, tope: 0 };

export function normalizarPolitica(p) {
  if (!p || !TIPOS_MULTA[p.tipo] || p.tipo === 'NINGUNA') return { ...SIN_MULTA };
  return { tipo: p.tipo, valor: Math.max(0, p.valor | 0), tope: Math.max(0, p.tope | 0) };
}

export function validarPolitica(p) {
  const e = {};
  if (!p || p.tipo === 'NINGUNA') return e;
  if (!TIPOS_MULTA[p.tipo]) e.multaTipo = 'Selecciona un tipo de multa.';
  if (!Number.isInteger(p.valor) || p.valor <= 0) e.multaValor = 'Escribe el valor de la multa.';
  if (p.tipo === 'DIARIA' && (!Number.isInteger(p.tope) || p.tope < 0)) e.multaTope = 'Escribe un tope válido (0 = sin tope).';
  return e;
}

const vigente = c => !c.anulado;
export const pendienteCargo = c => (vigente(c) ? c.monto - (c.pagado || 0) : 0);

/** Total de multas aplicadas que aún no se han cobrado. */
export const saldoMultas = cargos => cargos.reduce((s, c) => s + pendienteCargo(c), 0);

/** Lo que ya se cargó (vigente) a cada cuota. */
function cargadoPorCuota(cargos) {
  const m = new Map();
  for (const c of cargos) if (vigente(c)) m.set(c.cuotaId, (m.get(c.cuotaId) || 0) + c.monto);
  return m;
}

/**
 * Multas que corresponden hoy y todavía no se han aplicado.
 * @returns {{cuota, dias:number, monto:number}[]}
 */
export function multasSugeridas(credito, cuotas, cargos, hoy) {
  const p = normalizarPolitica(credito.multa);
  if (p.tipo === 'NINGUNA' || credito.cancelado) return [];
  const gracia = credito.diasGracia || 0;
  const cargado = cargadoPorCuota(cargos);
  const lista = [];
  for (const cuota of cuotas) {
    if (estadoCuota(cuota, hoy, gracia) !== 'VENCIDA') continue;
    const dias = Math.max(0, diasAtraso(cuota, hoy) - gracia);
    let total = p.tipo === 'FIJA' ? p.valor : p.valor * dias;
    if (p.tipo === 'DIARIA' && p.tope > 0) total = Math.min(total, p.tope);
    const monto = total - (cargado.get(cuota.id) || 0);
    if (monto > 0) lista.push({ cuota, dias, monto });
  }
  return lista;
}

/**
 * Reparte un cobro de multa entre los cargos pendientes, del más antiguo al más nuevo.
 * @returns {{cargoId:string, monto:number}[]}
 */
export function distribuirMulta(cargos, monto) {
  const pendientes = cargos.filter(c => pendienteCargo(c) > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.cuotaNumero || 0) - (b.cuotaNumero || 0));
  const total = pendientes.reduce((s, c) => s + pendienteCargo(c), 0);
  if (!Number.isInteger(monto) || monto <= 0) return [];
  if (monto > total) throw new Error('MULTA_EXCEDE');
  const out = [];
  let resto = monto;
  for (const c of pendientes) {
    if (!resto) break;
    const m = Math.min(resto, pendienteCargo(c));
    out.push({ cargoId: c.id, monto: m });
    resto -= m;
  }
  return out;
}
