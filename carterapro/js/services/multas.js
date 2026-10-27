// Multas por mora: se aplican (quedan guardadas como cargo) y se pueden perdonar.
import { transaccion, uid } from '../data/db.js';
import { ErrorNegocio } from '../domain/errores.js';
import { multasSugeridas } from '../domain/multas.js';
import { hoy as fechaHoy } from '../core/dates.js';
import { cambio } from './datos.js';

/** Guarda como cargo las multas que corresponden hoy y aún no se habían aplicado. */
export async function aplicarSugeridas(creditoId) {
  const hoy = fechaHoy();
  const r = await transaccion(['creditos', 'cuotas', 'cargos'], async api => {
    const credito = await api.get('creditos', creditoId);
    if (!credito) throw new ErrorNegocio('NO_EXISTE', 'Este crédito ya no existe.');
    const cuotas = await api.porIndice('cuotas', 'creditoId', creditoId);
    const cargos = await api.porIndice('cargos', 'creditoId', creditoId);
    const sugeridas = multasSugeridas(credito, cuotas, cargos, hoy);
    const ahora = new Date().toISOString();
    for (const s of sugeridas) {
      await api.put('cargos', {
        id: uid(), creditoId, clienteId: credito.clienteId, cuotaId: s.cuota.id, cuotaNumero: s.cuota.numero,
        fecha: hoy, monto: s.monto, dias: s.dias, concepto: 'Multa por mora', pagado: 0, anulado: false,
        esDemo: !!credito.esDemo, creadoEn: ahora, actualizadoEn: ahora,
      });
    }
    return sugeridas.reduce((s, x) => s + x.monto, 0);
  });
  if (r) cambio('multas:aplicadas', { creditoId, total: r });
  return r;
}

/** Perdona (anula) el saldo pendiente de una multa. Lo ya cobrado se conserva. */
export async function perdonar(cargoId, motivo) {
  const r = await transaccion(['cargos'], async api => {
    const c = await api.get('cargos', cargoId);
    if (!c) throw new ErrorNegocio('NO_EXISTE', 'Esta multa ya no existe.');
    const pagado = c.pagado || 0;
    // Si ya se cobró una parte, la multa queda por lo cobrado; si no, se anula completa.
    const a = pagado > 0
      ? { ...c, monto: pagado, perdonado: c.monto - pagado, motivoPerdon: String(motivo || '').trim() }
      : { ...c, anulado: true, motivoPerdon: String(motivo || '').trim() };
    await api.put('cargos', { ...a, actualizadoEn: new Date().toISOString() });
    return a;
  });
  cambio('multa:perdonada', r);
  return r;
}
