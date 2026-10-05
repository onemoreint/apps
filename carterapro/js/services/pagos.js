import { uno, transaccion, uid } from '../data/db.js';
import { distribuirPago, aplicarACuotas, saldoCuota } from '../domain/pagos.js';
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
 * Registra un pago de forma atómica: pago + cuotas actualizadas + consecutivo de recibo.
 * @returns {Promise<{pago, saldoDespues:number}>}
 */
export async function registrar({ creditoId, monto, fecha, metodoPago, observacion = '', esDemo = false, permitirFutura = false }) {
  const credito = await uno('creditos', creditoId);
  if (!credito) throw new ErrorNegocio('NO_EXISTE', 'No encontramos este crédito.');
  if (credito.cancelado) throw new ErrorNegocio('CANCELADO', 'Este crédito está cancelado y no recibe pagos.');

  return transaccion(['pagos', 'cuotas', 'contadores'], async api => {
    const cuotas = (await api.porIndice('cuotas', 'creditoId', creditoId)).sort((a, b) => a.numero - b.numero);
    const saldo = cuotas.reduce((s, c) => s + saldoCuota(c), 0);
    const errores = validarPago({ monto, fecha, metodoPago }, { saldo, hoy: permitirFutura ? null : hoy() });
    if (Object.keys(errores).length) throw new ErrorNegocio('VALIDACION', Object.values(errores)[0], errores);

    const { aplicaciones, saldoDespues } = distribuirPago(cuotas, monto);
    for (const c of aplicarACuotas(cuotas, aplicaciones, fecha)) await api.put('cuotas', c);

    const numero = await api.siguiente('recibo');
    const pago = {
      id: uid(),
      numeroRecibo: formatoRecibo(numero),
      creditoId,
      clienteId: credito.clienteId,
      cuotaId: aplicaciones[0].cuotaId,
      fecha,
      monto,
      metodoPago,
      observacion: String(observacion).trim(),
      aplicaciones,
      saldoDespues,
      anulado: false,
      esDemo,
      creadoEn: new Date().toISOString(),
    };
    await api.put('pagos', pago);
    return { pago, saldoDespues };
  }).then(r => { cambio('pago:registrado', r.pago); return r; });
}

/** Anula un pago: revierte lo aplicado en las cuotas y lo deja marcado en el historial. */
export async function anular(pagoId, motivo) {
  const r = await transaccion(['pagos', 'cuotas'], async api => {
    const pago = await api.get('pagos', pagoId);
    if (!pago) throw new ErrorNegocio('NO_EXISTE', 'Este pago ya no existe.');
    if (pago.anulado) throw new ErrorNegocio('YA_ANULADO', 'Este pago ya estaba anulado.');
    const cuotas = await api.porIndice('cuotas', 'creditoId', pago.creditoId);
    for (const c of aplicarACuotas(cuotas, pago.aplicaciones, pago.fecha, -1)) {
      // Recalcula la fecha del último pago con los pagos que siguen vigentes.
      const vigentes = (await api.porIndice('pagos', 'creditoId', pago.creditoId))
        .filter(p => !p.anulado && p.id !== pago.id && p.aplicaciones.some(a => a.cuotaId === c.id))
        .map(p => p.fecha).sort();
      c.fechaUltimoPago = vigentes.at(-1) || null;
      await api.put('cuotas', c);
    }
    const anulado = { ...pago, anulado: true, motivoAnulacion: String(motivo || '').trim(), fechaAnulacion: new Date().toISOString() };
    await api.put('pagos', anulado);
    return anulado;
  });
  cambio('pago:anulado', r);
  return r;
}
