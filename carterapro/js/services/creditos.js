import { uno, porIndice, transaccion, uid } from '../data/db.js';
import { calcularInteres } from '../domain/interes.js';
import { generarCuotas } from '../domain/cuotas.js';
import { validarCredito } from '../domain/validaciones.js';
import { ErrorNegocio } from '../domain/errores.js';
import { cambio } from './datos.js';

export const formatoNumero = n => '#' + String(n).padStart(4, '0');

/** Calcula el crédito completo sin guardarlo (vista previa del formulario). */
export function simular(e) {
  const errores = validarCredito(e);
  if (Object.keys(errores).length) return { errores };
  const interesTotal = calcularInteres({
    monto: e.montoPrestado, tipo: e.tipoInteres, tasaBp: e.tasaBp,
    numeroCuotas: e.numeroCuotas, interesFijo: e.interesFijo,
  });
  const cuotas = generarCuotas({ ...e, interesTotal });
  const valorCuota = cuotas[0].valorProgramado;
  return {
    errores: {},
    interesTotal,
    totalAPagar: e.montoPrestado + interesTotal,
    cuotas,
    valorCuota,
    ultimaDistinta: cuotas.at(-1).valorProgramado !== valorCuota ? cuotas.at(-1).valorProgramado : null,
    fechaUltimoVencimiento: cuotas.at(-1).fechaVencimiento,
  };
}

export async function crear(entrada) {
  const cliente = entrada.clienteId ? await uno('clientes', entrada.clienteId) : null;
  const errores = validarCredito(entrada, { existeCliente: !!cliente });
  if (Object.keys(errores).length) throw new ErrorNegocio('VALIDACION', 'Revisa los campos marcados.', errores);
  const sim = simular(entrada);
  const ahora = new Date().toISOString();
  const credito = {
    id: uid(),
    clienteId: cliente.id,
    fechaCreacion: ahora,
    fechaInicio: entrada.fechaInicio,
    fechaPrimerVencimiento: entrada.fechaPrimerVencimiento,
    fechaUltimoVencimiento: sim.fechaUltimoVencimiento,
    montoPrestado: entrada.montoPrestado,
    tipoInteres: entrada.tipoInteres,
    tasaBp: entrada.tasaBp || 0,
    interesFijo: entrada.tipoInteres === 'FIJO' ? entrada.interesFijo : 0,
    interesTotal: sim.interesTotal,
    totalAPagar: sim.totalAPagar,
    numeroCuotas: entrada.numeroCuotas,
    frecuencia: entrada.frecuencia,
    excluirDomingos: !!entrada.excluirDomingos,
    valorCuota: sim.valorCuota,
    diasGracia: entrada.diasGracia,
    cancelado: false,
    notas: String(entrada.notas || '').trim(),
    esDemo: !!entrada.esDemo,
    creadoEn: ahora,
    actualizadoEn: ahora,
  };
  await transaccion(['creditos', 'cuotas', 'contadores'], async api => {
    credito.numero = await api.siguiente('credito');
    await api.put('creditos', credito);
    for (const c of sim.cuotas) {
      await api.put('cuotas', {
        ...c, id: uid(), creditoId: credito.id, clienteId: credito.clienteId,
        pagadoCapital: 0, pagadoInteres: 0, valorPagado: 0,
        fechaUltimoPago: null, fechaPagoCompleto: null, esDemo: credito.esDemo,
      });
    }
  });
  cambio('credito:creado', credito);
  return credito;
}

/** Cancela (anula) un crédito: deja de contar en la cartera pero se conserva en el historial. */
export async function cancelar(id, motivo) {
  const credito = await uno('creditos', id);
  if (!credito) throw new ErrorNegocio('NO_EXISTE', 'Este crédito ya no existe.');
  if (credito.cancelado) return credito;
  const actualizado = { ...credito, cancelado: true, motivoCancelacion: String(motivo || '').trim(), fechaCancelacion: new Date().toISOString(), actualizadoEn: new Date().toISOString() };
  await transaccion(['creditos'], api => api.put('creditos', actualizado));
  cambio('credito:cancelado', actualizado);
  return actualizado;
}

export async function cuotasDe(creditoId) {
  return (await porIndice('cuotas', 'creditoId', creditoId)).sort((a, b) => a.numero - b.numero);
}
