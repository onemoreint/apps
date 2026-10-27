// Caja y liquidación. Funciones puras sobre los registros guardados.
//
// Efectivo que debe entregar un cobrador en un día:
//   base recibida + cobrado (cuotas + multas) − préstamos entregados − gastos
// Efectivo disponible del negocio (caja general):
//   aportes − retiros + cobrado − préstamos entregados − gastos
// La base es dinero que pasa de la caja general al cobrador: no cambia el total del negocio.

export const CATEGORIAS_GASTO = ['Transporte', 'Alimentación', 'Papelería', 'Comunicaciones', 'Comisiones', 'Arriendo', 'Otro'];

export const TIPOS_MOVIMIENTO = {
  APORTE: { nombre: 'Aporte de capital', signo: 1, explicacion: 'Dinero que el dueño mete al negocio.' },
  RETIRO: { nombre: 'Retiro del dueño', signo: -1, explicacion: 'Dinero que el dueño saca del negocio.' },
  BASE: { nombre: 'Base al cobrador', signo: 0, explicacion: 'Efectivo que se le entrega al cobrador para salir a la ruta.' },
};

export const SIN_COBRADOR = 'SIN';

/** Dinero que realmente salió al entregar el crédito (en una renovación, solo lo nuevo). */
export const desembolso = k => (Number.isInteger(k.desembolso) ? k.desembolso : k.montoPrestado);

/** Total recibido en un pago: cuotas + multa. */
export const totalPago = p => (p.monto || 0) + (p.multa || 0);

/** Un pago de renovación no mueve efectivo: el saldo viejo se pasa al crédito nuevo. */
export const mueveEfectivo = p => !p.anulado && p.tipo !== 'RENOVACION';

const enRango = (f, desde, hasta) => (!desde || f >= desde) && (!hasta || f <= hasta);

function coincide(cobradorId, filtro) {
  if (filtro == null || filtro === '') return true;
  if (filtro === SIN_COBRADOR) return !cobradorId;
  return cobradorId === filtro;
}

/**
 * @param {{pagos?, creditos?, gastos?, caja?}} datos
 * @param {{desde?:string, hasta?:string, cobradorId?:string}} filtro
 */
export function resumenCaja({ pagos = [], creditos = [], gastos = [], caja = [] }, { desde, hasta, cobradorId } = {}) {
  const lPagos = pagos.filter(p => mueveEfectivo(p) && enRango(p.fecha, desde, hasta) && coincide(p.cobradorId, cobradorId));
  const lCreditos = creditos.filter(k => !k.cancelado && enRango(k.fechaInicio, desde, hasta) && coincide(k.cobradorId, cobradorId) && desembolso(k) > 0);
  const lGastos = gastos.filter(g => !g.anulado && enRango(g.fecha, desde, hasta) && coincide(g.cobradorId, cobradorId));
  const lMovs = caja.filter(m => !m.anulado && enRango(m.fecha, desde, hasta));

  const suma = (l, f) => l.reduce((s, x) => s + f(x), 0);
  const cobradoCuotas = suma(lPagos, p => p.monto || 0);
  const cobradoMultas = suma(lPagos, p => p.multa || 0);
  const intereses = suma(lPagos, p => suma(p.aplicaciones || [], a => a.interes || 0));
  const prestado = suma(lCreditos, desembolso);
  const totalGastos = suma(lGastos, g => g.monto);
  const aportes = suma(lMovs.filter(m => m.tipo === 'APORTE'), m => m.monto);
  const retiros = suma(lMovs.filter(m => m.tipo === 'RETIRO'), m => m.monto);
  // La base solo cuenta al liquidar a un cobrador; para el negocio completo es un traslado interno.
  const base = cobradorId ? suma(lMovs.filter(m => m.tipo === 'BASE' && coincide(m.cobradorId, cobradorId)), m => m.monto) : 0;
  const cobrado = cobradoCuotas + cobradoMultas;

  return {
    pagos: lPagos, desembolsos: lCreditos, gastos: lGastos, movimientos: lMovs,
    cobradoCuotas, cobradoMultas, cobrado, intereses, capitalRecuperado: cobradoCuotas - intereses,
    prestado, numeroPrestamos: lCreditos.length, totalGastos, aportes, retiros, base,
    /** Lo que el cobrador (o la caja del día) debe tener en la mano. */
    esperado: base + cobrado - prestado - totalGastos,
    /** Movimiento neto del negocio en el periodo (sin contar bases). */
    neto: aportes - retiros + cobrado - prestado - totalGastos,
    /** Ganancia del periodo: intereses + multas − gastos. */
    utilidad: intereses + cobradoMultas - totalGastos,
  };
}

/** Efectivo disponible del negocio desde el primer registro hasta la fecha. */
export function efectivoDisponible(datos, hasta) {
  return resumenCaja(datos, { hasta }).neto;
}

/** Diferencia de un cierre: positivo = sobrante, negativo = faltante. */
export const diferenciaCierre = (esperado, entregado) => entregado - esperado;
