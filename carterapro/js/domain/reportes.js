// Reportes por periodo. Funciones puras: reciben datos y el análisis de cartera.
import { inicioMes, finMes, inicioSemana, sumarDias, sumarMeses, diferenciaDias, esValida } from '../core/dates.js';

export const PERIODOS = {
  HOY: 'Hoy',
  SEMANA: 'Esta semana',
  MES: 'Este mes',
  MES_ANTERIOR: 'Mes anterior',
  PERSONALIZADO: 'Personalizado',
};

/** @returns {{desde:string, hasta:string}} rango inclusivo */
export function rangoPeriodo(tipo, hoy, personalizado = {}) {
  switch (tipo) {
    case 'HOY': return { desde: hoy, hasta: hoy };
    case 'SEMANA': return { desde: inicioSemana(hoy), hasta: sumarDias(inicioSemana(hoy), 6) };
    case 'MES_ANTERIOR': {
      const m = sumarMeses(inicioMes(hoy), -1);
      return { desde: m, hasta: finMes(m) };
    }
    case 'PERSONALIZADO': {
      const { desde, hasta } = personalizado;
      if (esValida(desde) && esValida(hasta)) return diferenciaDias(desde, hasta) >= 0 ? { desde, hasta } : { desde: hasta, hasta: desde };
      return { desde: inicioMes(hoy), hasta: finMes(hoy) };
    }
    default: return { desde: inicioMes(hoy), hasta: finMes(hoy) };
  }
}

const enRango = (f, { desde, hasta }) => f >= desde && f <= hasta;

export function reportePeriodo({ datos, analisis }, rango) {
  const pagos = datos.pagos.filter(p => !p.anulado && enRango(p.fecha, rango))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.numeroRecibo.localeCompare(b.numeroRecibo));

  const cobro = { total: 0, capital: 0, interes: 0, n: pagos.length, porMetodo: {}, porDia: new Map() };
  for (const p of pagos) {
    cobro.total += p.monto;
    for (const a of p.aplicaciones) { cobro.capital += a.capital; cobro.interes += a.interes; }
    cobro.porMetodo[p.metodoPago] = (cobro.porMetodo[p.metodoPago] || 0) + p.monto;
    cobro.porDia.set(p.fecha, (cobro.porDia.get(p.fecha) || 0) + p.monto);
  }

  // Lo que vencía dentro del periodo y cuánto de eso se ha pagado.
  let esperado = 0, cobradoDeEsperado = 0, cuotasPeriodo = 0, cuotasPagadas = 0;
  const nuevos = [];
  const pagados = [];
  for (const { credito, cuotas, resumen } of analisis.creditos.values()) {
    if (credito.cancelado) continue;
    if (enRango(credito.fechaInicio, rango)) nuevos.push(credito);
    if (resumen.estado === 'PAGADO') {
      const fin = cuotas.reduce((m, c) => (c.fechaPagoCompleto && c.fechaPagoCompleto > m ? c.fechaPagoCompleto : m), '');
      if (fin && enRango(fin, rango)) pagados.push(credito);
    }
    for (const c of cuotas) {
      if (!enRango(c.fechaVencimiento, rango)) continue;
      cuotasPeriodo++;
      esperado += c.valorProgramado;
      cobradoDeEsperado += c.valorPagado || 0;
      if (c.valorPagado >= c.valorProgramado) cuotasPagadas++;
    }
  }

  const mora = [...analisis.clientes.values()].filter(ic => ic.vencido > 0).map(ic => {
    let cuotas = 0, maxAtraso = 0;
    for (const i of ic.creditos) { cuotas += i.resumen.vencidas; maxAtraso = Math.max(maxAtraso, i.resumen.maxAtraso); }
    return { cliente: ic.cliente, vencido: ic.vencido, saldo: ic.saldo, cuotas, maxAtraso };
  }).sort((a, b) => b.vencido - a.vencido);

  return {
    rango,
    pagos,
    cobro,
    esperado, cobradoDeEsperado, cuotasPeriodo, cuotasPagadas,
    cumplimiento: esperado ? cobradoDeEsperado / esperado : null,
    nuevos,
    prestadoNuevo: nuevos.reduce((s, k) => s + k.montoPrestado, 0),
    pagados,
    mora,
    kpis: analisis.kpis,
  };
}

/**
 * Serie continua para graficar, agrupada según el largo del periodo:
 * hasta 31 días por día, hasta 6 meses por semana y más allá por mes.
 * @returns {{agrupacion:'dia'|'semana'|'mes', puntos:{clave:string, desde:string, valor:number}[]}}
 */
export function serieAgrupada(porDia, { desde, hasta }) {
  const dias = diferenciaDias(desde, hasta) + 1;
  const agrupacion = dias <= 31 ? 'dia' : dias <= 186 ? 'semana' : 'mes';
  const claveDe = f => (agrupacion === 'dia' ? f : agrupacion === 'semana' ? inicioSemana(f) : inicioMes(f));
  const puntos = new Map();
  for (let i = 0; i < dias; i++) {
    const f = sumarDias(desde, i);
    const k = claveDe(f);
    if (!puntos.has(k)) puntos.set(k, { clave: k, desde: f, valor: 0 });
    puntos.get(k).valor += porDia.get(f) || 0;
  }
  return { agrupacion, puntos: [...puntos.values()] };
}
