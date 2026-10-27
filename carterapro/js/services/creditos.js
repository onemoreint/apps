import { uno, porIndice, transaccion, uid } from '../data/db.js';
import { calcularInteres } from '../domain/interes.js';
import { generarCuotas } from '../domain/cuotas.js';
import { validarCredito } from '../domain/validaciones.js';
import { normalizarPolitica, validarPolitica } from '../domain/multas.js';
import { saldoCuota } from '../domain/pagos.js';
import { ErrorNegocio } from '../domain/errores.js';
import { cambio } from './datos.js';
import { registrarEnTransaccion } from './pagos.js';

export const formatoNumero = n => '#' + String(n).padStart(4, '0');

/** Calcula el crédito completo sin guardarlo (vista previa del formulario). */
export function simular(e) {
  const errores = { ...validarCredito(e), ...validarPolitica(e.multa) };
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

function armar(entrada, cliente, sim) {
  const ahora = new Date().toISOString();
  return {
    id: uid(),
    clienteId: cliente.id,
    fechaCreacion: ahora,
    fechaInicio: entrada.fechaInicio,
    fechaPrimerVencimiento: entrada.fechaPrimerVencimiento,
    fechaUltimoVencimiento: sim.fechaUltimoVencimiento,
    montoPrestado: entrada.montoPrestado,
    desembolso: entrada.montoPrestado,
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
    cobradorId: entrada.cobradorId || null,
    multa: normalizarPolitica(entrada.multa),
    cancelado: false,
    notas: String(entrada.notas || '').trim(),
    esDemo: !!entrada.esDemo,
    creadoEn: ahora,
    actualizadoEn: ahora,
  };
}

async function guardarEnTransaccion(api, credito, cuotas) {
  credito.numero = await api.siguiente('credito');
  await api.put('creditos', credito);
  for (const c of cuotas) {
    await api.put('cuotas', {
      ...c, id: uid(), creditoId: credito.id, clienteId: credito.clienteId,
      pagadoCapital: 0, pagadoInteres: 0, valorPagado: 0,
      fechaUltimoPago: null, fechaPagoCompleto: null, esDemo: credito.esDemo,
    });
  }
}

async function preparar(entrada) {
  const cliente = entrada.clienteId ? await uno('clientes', entrada.clienteId) : null;
  const errores = { ...validarCredito(entrada, { existeCliente: !!cliente }), ...validarPolitica(entrada.multa) };
  if (Object.keys(errores).length) throw new ErrorNegocio('VALIDACION', 'Revisa los campos marcados.', errores);
  return armar(entrada, cliente, simular(entrada));
}

export async function crear(entrada) {
  const credito = await preparar(entrada);
  const { cuotas } = simular(entrada);
  await transaccion(['creditos', 'cuotas', 'contadores'], api => guardarEnTransaccion(api, credito, cuotas));
  cambio('credito:creado', credito);
  return credito;
}

/** Saldo que se trasladaría al renovar (lo que falta por pagar del crédito actual). */
export async function saldoParaRenovar(id) {
  return (await cuotasDe(id)).reduce((s, c) => s + saldoCuota(c), 0);
}

/**
 * Renueva un crédito: el saldo pendiente del crédito actual se cancela con un pago de "Renovación"
 * (no es efectivo) y se crea un crédito nuevo. Al cliente solo se le entrega la diferencia.
 * Todo ocurre en una sola transacción.
 */
export async function renovar(anteriorId, entrada) {
  const anterior = await uno('creditos', anteriorId);
  if (!anterior) throw new ErrorNegocio('NO_EXISTE', 'No encontramos el crédito que se va a renovar.');
  if (anterior.cancelado) throw new ErrorNegocio('CANCELADO', 'Un crédito cancelado no se puede renovar.');
  if (anterior.renovadoPor) throw new ErrorNegocio('YA_RENOVADO', 'Este crédito ya fue renovado.');
  if (entrada.clienteId !== anterior.clienteId) throw new ErrorNegocio('CLIENTE', 'La renovación debe ser para el mismo cliente.');
  const nuevo = await preparar(entrada);
  const { cuotas } = simular(entrada);

  const r = await transaccion(['creditos', 'cuotas', 'pagos', 'contadores'], async api => {
    const cuotasAnt = await api.porIndice('cuotas', 'creditoId', anteriorId);
    const saldo = cuotasAnt.reduce((s, c) => s + saldoCuota(c), 0);
    if (entrada.montoPrestado < saldo) {
      throw new ErrorNegocio('VALIDACION', 'El nuevo monto debe cubrir al menos el saldo pendiente.', { monto: `Mínimo ${saldo}` });
    }
    nuevo.renovadoDe = anteriorId;
    nuevo.saldoRenovado = saldo;
    nuevo.desembolso = entrada.montoPrestado - saldo;
    await guardarEnTransaccion(api, nuevo, cuotas);
    let pago = null;
    if (saldo > 0) {
      ({ pago } = await registrarEnTransaccion(api, anterior, {
        monto: saldo, fecha: entrada.fechaInicio, metodoPago: 'Renovación', tipo: 'RENOVACION',
        observacion: `Saldo trasladado al crédito ${formatoNumero(nuevo.numero)}`, cobradorId: nuevo.cobradorId, permitirFutura: true,
      }));
    }
    const ahora = new Date().toISOString();
    await api.put('creditos', { ...anterior, renovadoPor: nuevo.id, fechaRenovacion: entrada.fechaInicio, actualizadoEn: ahora });
    return { credito: nuevo, saldo, pago };
  });
  cambio('credito:renovado', r.credito);
  return r;
}

/** Cambia datos operativos que no alteran el plan de cuotas (cobrador, multa, notas). */
export async function actualizarOperacion(id, { cobradorId, multa, notas }) {
  const credito = await uno('creditos', id);
  if (!credito) throw new ErrorNegocio('NO_EXISTE', 'Este crédito ya no existe.');
  const errores = multa ? validarPolitica(multa) : {};
  if (Object.keys(errores).length) throw new ErrorNegocio('VALIDACION', Object.values(errores)[0], errores);
  const actualizado = {
    ...credito,
    ...(cobradorId !== undefined ? { cobradorId: cobradorId || null } : {}),
    ...(multa ? { multa: normalizarPolitica(multa) } : {}),
    ...(notas !== undefined ? { notas: String(notas).trim() } : {}),
    actualizadoEn: new Date().toISOString(),
  };
  await transaccion(['creditos'], api => api.put('creditos', actualizado));
  cambio('credito:actualizado', actualizado);
  return actualizado;
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
