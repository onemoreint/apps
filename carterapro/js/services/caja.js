// Movimientos de caja (aportes, retiros, base al cobrador) y cierres de caja diarios.
import { transaccion, uid } from '../data/db.js';
import { esValida, hoy, diferenciaDias } from '../core/dates.js';
import { ErrorNegocio } from '../domain/errores.js';
import { TIPOS_MOVIMIENTO, diferenciaCierre } from '../domain/caja.js';
import { cambio } from './datos.js';

export async function registrarMovimiento({ tipo, monto, fecha, cobradorId, nota = '', esDemo = false }) {
  const e = {};
  if (!TIPOS_MOVIMIENTO[tipo]) e.tipo = 'Selecciona el tipo de movimiento.';
  if (!Number.isInteger(monto) || monto <= 0) e.monto = 'Escribe un valor mayor que cero.';
  if (!esValida(fecha)) e.fecha = 'Escribe una fecha válida.';
  else if (diferenciaDias(hoy(), fecha) > 0) e.fecha = 'La fecha no puede ser futura.';
  if (Object.keys(e).length) throw new ErrorNegocio('VALIDACION', Object.values(e)[0], e);
  const ahora = new Date().toISOString();
  const mov = {
    id: uid(), tipo, monto, fecha, cobradorId: tipo === 'BASE' ? (cobradorId || null) : null,
    nota: String(nota).trim(), anulado: false, esDemo, creadoEn: ahora, actualizadoEn: ahora,
  };
  await transaccion(['caja'], api => api.put('caja', mov));
  cambio('caja:movimiento', mov);
  return mov;
}

export async function anularMovimiento(id, motivo) {
  const r = await transaccion(['caja'], async api => {
    const m = await api.get('caja', id);
    if (!m) throw new ErrorNegocio('NO_EXISTE', 'Este movimiento ya no existe.');
    const a = { ...m, anulado: true, motivoAnulacion: String(motivo || '').trim(), actualizadoEn: new Date().toISOString() };
    await api.put('caja', a);
    return a;
  });
  cambio('caja:anulado', r);
  return r;
}

/**
 * Guarda el cierre del día: lo que el sistema esperaba frente a lo que se entregó.
 * @param {{fecha, cobradorId, resumen, entregado, nota}} p resumen = resultado de resumenCaja
 */
export async function cerrar({ fecha, cobradorId, resumen, entregado, nota = '' }) {
  if (!Number.isInteger(entregado) || entregado < 0) {
    throw new ErrorNegocio('VALIDACION', 'Escribe el efectivo entregado (puede ser 0).', { entregado: 'Escribe el efectivo entregado.' });
  }
  const ahora = new Date().toISOString();
  const cierre = {
    id: uid(), fecha, cobradorId: cobradorId || null,
    base: resumen.base, cobrado: resumen.cobrado, multas: resumen.cobradoMultas, prestado: resumen.prestado,
    gastos: resumen.totalGastos, esperado: resumen.esperado, entregado,
    diferencia: diferenciaCierre(resumen.esperado, entregado), nota: String(nota).trim(),
    pagos: resumen.pagos.length, creadoEn: ahora,
  };
  await transaccion(['cierres'], api => api.put('cierres', cierre));
  cambio('caja:cierre', cierre);
  return cierre;
}
