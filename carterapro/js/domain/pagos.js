// Reglas de aplicación de pagos.
// 1. El pago se aplica a la cuota pendiente más antigua; el excedente pasa a la siguiente.
// 2. Dentro de cada cuota, lo pagado se reparte entre capital e interés en la misma
//    proporción que tiene lo que falta de esa cuota.
// 3. No se acepta un pago mayor que el saldo total del crédito.
import { ErrorNegocio } from './errores.js';

export const saldoCapitalCuota = c => c.capital - (c.pagadoCapital || 0);
export const saldoInteresCuota = c => c.interes - (c.pagadoInteres || 0);
export const saldoCuota = c => saldoCapitalCuota(c) + saldoInteresCuota(c);

/**
 * Calcula cómo se distribuye un pago. No modifica las cuotas.
 * @returns {{aplicaciones: {cuotaId, numeroCuota, capital, interes, monto, liquida:boolean}[], saldoAntes:number, saldoDespues:number}}
 */
export function distribuirPago(cuotas, monto) {
  if (!Number.isInteger(monto) || monto <= 0) {
    throw new ErrorNegocio('MONTO_INVALIDO', 'El valor del pago debe ser mayor que cero.');
  }
  const pendientes = [...cuotas].sort((a, b) => a.numero - b.numero).filter(c => saldoCuota(c) > 0);
  const saldoAntes = pendientes.reduce((s, c) => s + saldoCuota(c), 0);
  if (saldoAntes === 0) throw new ErrorNegocio('CREDITO_PAGADO', 'Este crédito ya no tiene saldo pendiente.');
  if (monto > saldoAntes) {
    throw new ErrorNegocio('PAGO_EXCEDE_SALDO', 'El pago es mayor que lo que se debe en este crédito.', { saldo: saldoAntes });
  }

  const aplicaciones = [];
  let restante = monto;
  for (const c of pendientes) {
    if (restante === 0) break;
    const rc = saldoCapitalCuota(c);
    const ri = saldoInteresCuota(c);
    const saldo = rc + ri;
    let capital, interes;
    if (restante >= saldo) {
      capital = rc;
      interes = ri;
    } else {
      interes = Math.round((restante * ri) / saldo);
      capital = restante - interes;
    }
    const aplicado = capital + interes;
    aplicaciones.push({ cuotaId: c.id, numeroCuota: c.numero, capital, interes, monto: aplicado, liquida: aplicado === saldo });
    restante -= aplicado;
  }
  return { aplicaciones, saldoAntes, saldoDespues: saldoAntes - monto };
}

/** Devuelve copias de las cuotas con el pago aplicado (signo=-1 para revertir). */
export function aplicarACuotas(cuotas, aplicaciones, fechaPago, signo = 1) {
  const porId = new Map(aplicaciones.map(a => [a.cuotaId, a]));
  return cuotas.filter(c => porId.has(c.id)).map(c => {
    const a = porId.get(c.id);
    const n = {
      ...c,
      pagadoCapital: (c.pagadoCapital || 0) + signo * a.capital,
      pagadoInteres: (c.pagadoInteres || 0) + signo * a.interes,
    };
    n.valorPagado = n.pagadoCapital + n.pagadoInteres;
    if (signo > 0) {
      n.fechaUltimoPago = fechaPago;
      if (saldoCuota(n) === 0) n.fechaPagoCompleto = fechaPago;
    } else if (saldoCuota(n) > 0) {
      n.fechaPagoCompleto = null;
    }
    if (n.pagadoCapital < 0 || n.pagadoInteres < 0) {
      throw new ErrorNegocio('REVERSION_INVALIDA', 'No fue posible revertir este pago.');
    }
    return n;
  });
}

/** Valor sugerido para pagar hasta la cuota indicada (incluye cuotas anteriores pendientes). */
export function montoHastaCuota(cuotas, numero) {
  return cuotas.filter(c => c.numero <= numero).reduce((s, c) => s + saldoCuota(c), 0);
}
