// Validaciones de entrada. Devuelven { campo: mensaje } — vacío si todo está bien.
import { esValida, diferenciaDias } from '../core/dates.js';
import { TIPOS_INTERES } from './interes.js';
import { FRECUENCIAS } from './cuotas.js';

export const soloDigitos = s => String(s || '').replace(/\D/g, '');

export const normalizarTexto = s => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function validarCliente(c) {
  const e = {};
  const nombre = String(c.nombreCompleto || '').trim();
  if (nombre.length < 3) e.nombreCompleto = 'Escribe el nombre completo (mínimo 3 letras).';
  else if (nombre.length > 120) e.nombreCompleto = 'El nombre es demasiado largo.';
  const tel = soloDigitos(c.telefono);
  if (!tel) e.telefono = 'El teléfono es necesario para contactar al cliente.';
  else if (tel.length < 7 || tel.length > 15) e.telefono = 'Revisa el teléfono: debe tener entre 7 y 15 dígitos.';
  const wa = soloDigitos(c.whatsapp);
  if (wa && (wa.length < 7 || wa.length > 15)) e.whatsapp = 'Revisa el número de WhatsApp.';
  if (c.documento && !/^[\w.\-\s]{3,25}$/.test(String(c.documento).trim())) {
    e.documento = 'El documento solo puede tener letras, números, puntos o guiones.';
  }
  return e;
}

/** Busca clientes que parezcan el mismo (documento o teléfono iguales, o mismo nombre). */
export function buscarDuplicados(nuevo, existentes) {
  const doc = normalizarTexto(nuevo.documento).replace(/[.\-\s]/g, '');
  const tel = soloDigitos(nuevo.telefono).slice(-10);
  const nombre = normalizarTexto(nuevo.nombreCompleto);
  return existentes.filter(c => c.id !== nuevo.id).map(c => {
    const motivos = [];
    if (doc && normalizarTexto(c.documento).replace(/[.\-\s]/g, '') === doc) motivos.push('documento');
    if (tel && soloDigitos(c.telefono).slice(-10) === tel) motivos.push('teléfono');
    if (nombre && normalizarTexto(c.nombreCompleto) === nombre) motivos.push('nombre');
    return motivos.length ? { cliente: c, motivos } : null;
  }).filter(Boolean);
}

export function validarCredito(c, { existeCliente = true } = {}) {
  const e = {};
  if (!c.clienteId || !existeCliente) e.clienteId = 'Selecciona el cliente que recibe el préstamo.';
  if (!Number.isInteger(c.montoPrestado) || c.montoPrestado <= 0) e.montoPrestado = 'Escribe un monto mayor que cero.';
  if (!TIPOS_INTERES[c.tipoInteres]) e.tipoInteres = 'Selecciona un tipo de interés.';
  else if (TIPOS_INTERES[c.tipoInteres].usaTasa) {
    if (!Number.isFinite(c.tasaBp) || c.tasaBp <= 0) e.tasa = 'Escribe un porcentaje mayor que cero.';
    else if (c.tasaBp > 100000) e.tasa = 'El porcentaje parece demasiado alto. Revísalo.';
  } else if (c.tipoInteres === 'FIJO' && (!Number.isInteger(c.interesFijo) || c.interesFijo < 0)) {
    e.interesFijo = 'Escribe el valor del interés (puede ser 0).';
  }
  if (!Number.isInteger(c.numeroCuotas) || c.numeroCuotas < 1) e.numeroCuotas = 'Debe haber al menos 1 cuota.';
  else if (c.numeroCuotas > 1000) e.numeroCuotas = 'El máximo es 1.000 cuotas.';
  if (!FRECUENCIAS[c.frecuencia]) e.frecuencia = 'Selecciona cada cuánto se paga.';
  if (!esValida(c.fechaInicio)) e.fechaInicio = 'Escribe una fecha válida.';
  if (!esValida(c.fechaPrimerVencimiento)) e.fechaPrimerVencimiento = 'Escribe una fecha válida.';
  else if (esValida(c.fechaInicio) && diferenciaDias(c.fechaInicio, c.fechaPrimerVencimiento) < 0) {
    e.fechaPrimerVencimiento = 'La primera cuota no puede vencer antes de la fecha del préstamo.';
  }
  if (!Number.isInteger(c.diasGracia) || c.diasGracia < 0 || c.diasGracia > 60) e.diasGracia = 'Entre 0 y 60 días.';
  return e;
}

export function validarPago(p, { saldo, hoy }) {
  const e = {};
  if (!Number.isInteger(p.monto) || p.monto <= 0) e.monto = 'Escribe un valor mayor que cero.';
  else if (p.monto > saldo) e.monto = 'El pago es mayor que el saldo pendiente del crédito.';
  if (!esValida(p.fecha)) e.fecha = 'Escribe una fecha válida.';
  else if (hoy && diferenciaDias(hoy, p.fecha) > 0) e.fecha = 'La fecha del pago no puede ser futura.';
  if (!p.metodoPago) e.metodoPago = 'Selecciona cómo pagó el cliente.';
  return e;
}
