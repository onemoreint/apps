import { uno, transaccion, uid } from '../data/db.js';
import { distribuirPago, aplicarACuotas, saldoCuota } from '../domain/pagos.js';
import { distribuirMulta, pendienteCargo } from '../domain/multas.js';
import { validarPago } from '../domain/validaciones.js';
import { ErrorNegocio } from '../domain/errores.js';
import { hoy } from '../core/dates.js';
import { cambio } from './datos.js';
import { cuotasDe } from './creditos.js';

export const formatoRecibo = n => 'R-' + String(n).padStart(6, '0');

/** Cómo se aplicaría un pago, sin guardarlo. */
export async function previsualizar(creditoId, monto) {
  return distribuirPago(await cuotasDe(creditoId), monto);
}

/**
 * Registra el pago dentro de una transacción abierta (la usa también la renovación).
 * La transacción debe incluir 'pagos', 'cuotas' y 'contadores' (y 'cargos' si hay multa).
 */
export async function registrarEnTransaccion(api, credito, {
  monto, multa = 0, fecha, metodoPago, observacion = '', esDemo = false, permitirFutura = false, tipo = 'NORMAL', cobradorId,
}) {
  const cuotas = (await api.porIndice('cuotas', 'creditoId', credito.id)).sort((a, b) => a.numero - b.numero);
  const saldo = cuotas.reduce((s, c) => s + saldoCuota(c), 0);
  const multaValida = Number.isInteger(multa) && multa > 0 ? multa : 0;
  const errores = validarPago({ monto, fecha, metodoPago }, { saldo, hoy: permitirFutura ? null : hoy(), soloMulta: multaValida > 0 });
  if (Object.keys(errores).length) throw new ErrorNegocio('VALIDACION', Object.values(errores)[0], errores);

  let aplicaciones = [], saldoDespues = saldo;
  if (monto > 0) {
    ({ aplicaciones, saldoDespues } = distribuirPago(cuotas, monto));
    for (const c of aplicarACuotas(cuotas, aplicaciones, fecha)) await api.put('cuotas', c);
  }

  let cargosAplicados = [];
  if (multaValida) {
    const cargos = await api.porIndice('cargos', 'creditoId', credito.id);
    const pendiente = cargos.reduce((s, c) => s + pendienteCargo(c), 0);
    if (multaValida > pendiente) throw new ErrorNegocio('VALIDACION', 'La multa cobrada es mayor que la multa pendiente.', { multa: 'Supera la multa pendiente.' });
    cargosAplicados = distribuirMulta(cargos, multaValida);
    const porId = new Map(cargos.map(c => [c.id, c]));
    for (const a of cargosAplicados) {
      const c = porId.get(a.cargoId);
      await api.put('cargos', { ...c, pagado: (c.pagado || 0) + a.monto, actualizadoEn: new Date().toISOString() });
    }
  }

  const numero = await api.siguiente('recibo');
  const pago = {
    id: uid(),
    numeroRecibo: formatoRecibo(numero),
    creditoId: credito.id,
    clienteId: credito.clienteId,
    cuotaId: aplicaciones[0]?.cuotaId || null,
    fecha,
    monto,
    multa: multaValida,
    cargosAplicados,
    metodoPago,
    observacion: String(observacion).trim(),
    aplicaciones,
    saldoDespues,
    tipo,
    cobradorId: cobradorId !== undefined ? (cobradorId || null) : (credito.cobradorId || null),
    anulado: false,
    esDemo,
    creadoEn: new Date().toISOString(),
  };
  await api.put('pagos', pago);
  return { pago, saldoDespues };
}

/**
 * Registra un pago de forma atómica: pago + cuotas actualizadas + multas + consecutivo de recibo.
 * @returns {Promise<{pago, saldoDespues:number}>}
 */
export async function registrar(datos) {
  const credito = await uno('creditos', datos.creditoId);
  if (!credito) throw new ErrorNegocio('NO_EXISTE', 'No encontramos este crédito.');
  if (credito.cancelado) throw new ErrorNegocio('CANCELADO', 'Este crédito está cancelado y no recibe pagos.');
  const r = await transaccion(['pagos', 'cuotas', 'contadores', 'cargos'], api => registrarEnTransaccion(api, credito, datos));
  cambio('pago:registrado', r.pago);
  return r;
}

/** Anula un pago: revierte lo aplicado en cuotas y multas y lo deja marcado en el historial. */
export async function anular(pagoId, motivo) {
  const r = await transaccion(['pagos', 'cuotas', 'cargos', 'creditos'], async api => {
    const pago = await api.get('pagos', pagoId);
    if (!pago) throw new ErrorNegocio('NO_EXISTE', 'Este pago ya no existe.');
    if (pago.anulado) throw new ErrorNegocio('YA_ANULADO', 'Este pago ya estaba anulado.');
    if (pago.tipo === 'RENOVACION') {
      const credito = await api.get('creditos', pago.creditoId);
      if (credito?.renovadoPor) throw new ErrorNegocio('RENOVACION', 'Este pago cerró el crédito por una renovación. Para deshacerlo, cancela el crédito nuevo.');
    }
    const cuotas = await api.porIndice('cuotas', 'creditoId', pago.creditoId);
    for (const c of aplicarACuotas(cuotas, pago.aplicaciones, pago.fecha, -1)) {
      // Recalcula la fecha del último pago con los pagos que siguen vigentes.
      const vigentes = (await api.porIndice('pagos', 'creditoId', pago.creditoId))
        .filter(p => !p.anulado && p.id !== pago.id && p.aplicaciones.some(a => a.cuotaId === c.id))
        .map(p => p.fecha).sort();
      c.fechaUltimoPago = vigentes.at(-1) || null;
      await api.put('cuotas', c);
    }
    for (const a of pago.cargosAplicados || []) {
      const c = await api.get('cargos', a.cargoId);
      if (c) await api.put('cargos', { ...c, pagado: Math.max(0, (c.pagado || 0) - a.monto), actualizadoEn: new Date().toISOString() });
    }
    const anulado = { ...pago, anulado: true, motivoAnulacion: String(motivo || '').trim(), fechaAnulacion: new Date().toISOString() };
    await api.put('pagos', anulado);
    return anulado;
  });
  cambio('pago:anulado', r);
  return r;
}
