// Modalidades de interés simple. Todas son "planas": el interés se calcula una vez
// al crear el crédito y se reparte en partes iguales entre las cuotas.
import { ErrorNegocio } from './errores.js';

export const TIPOS_INTERES = {
  PCT_CAPITAL: {
    nombre: 'Porcentaje sobre el capital',
    corto: '% sobre capital',
    usaTasa: true,
    explicacion: 'Se cobra un porcentaje del dinero prestado, una sola vez, sin importar cuántas cuotas tenga el crédito.',
    ejemplo: 'Prestas $1.000.000 al 10% → interés de $100.000. Total a pagar: $1.100.000.',
  },
  PCT_PERIODO: {
    nombre: 'Porcentaje por periodo',
    corto: '% por periodo',
    usaTasa: true,
    explicacion: 'Se cobra un porcentaje del dinero prestado por cada cuota (cada día, semana, quincena o mes, según la frecuencia).',
    ejemplo: 'Prestas $1.000.000 al 2% por cuota en 20 cuotas → interés de $400.000. Total: $1.400.000.',
  },
  FIJO: {
    nombre: 'Interés fijo',
    corto: 'Interés fijo',
    usaTasa: false,
    explicacion: 'Tú escribes el valor exacto del interés en dinero.',
    ejemplo: 'Prestas $1.000.000 y cobras $150.000 de interés. Total: $1.150.000.',
  },
  SIN_INTERES: {
    nombre: 'Sin interés',
    corto: 'Sin interés',
    usaTasa: false,
    explicacion: 'El cliente devuelve exactamente lo que se le prestó.',
    ejemplo: 'Prestas $1.000.000 → el cliente paga $1.000.000.',
  },
};

/** Convierte "10" o "2,5" (porcentaje) a puntos básicos: 10% → 1000. */
export function porcentajeABp(texto) {
  const n = parseFloat(String(texto ?? '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

export const bpATexto = bp => (bp / 100).toLocaleString('es-CO', { maximumFractionDigits: 2 });

/**
 * @param {{monto:number, tipo:string, tasaBp?:number, numeroCuotas?:number, interesFijo?:number}} p
 * @returns {number} interés total en unidad mínima
 */
export function calcularInteres({ monto, tipo, tasaBp = 0, numeroCuotas = 1, interesFijo = 0 }) {
  switch (tipo) {
    case 'SIN_INTERES': return 0;
    case 'FIJO':
      if (!Number.isInteger(interesFijo) || interesFijo < 0) throw new ErrorNegocio('INTERES_INVALIDO', 'El interés fijo debe ser un valor positivo.');
      return interesFijo;
    case 'PCT_CAPITAL':
      return Math.round((monto * tasaBp) / 10000);
    case 'PCT_PERIODO':
      return Math.round((monto * tasaBp * numeroCuotas) / 10000);
    default:
      throw new ErrorNegocio('TIPO_INTERES', 'Selecciona un tipo de interés válido.');
  }
}
