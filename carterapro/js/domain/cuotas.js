// Generación del plan de cuotas.
import { sumarDias, sumarMeses, diaSemana, esValida } from '../core/dates.js';
import { ErrorNegocio } from './errores.js';

export const FRECUENCIAS = {
  DIARIA: { nombre: 'Diaria', unidad: 'día', plural: 'días' },
  SEMANAL: { nombre: 'Semanal', unidad: 'semana', plural: 'semanas' },
  QUINCENAL: { nombre: 'Quincenal', unidad: 'quincena', plural: 'quincenas' },
  MENSUAL: { nombre: 'Mensual', unidad: 'mes', plural: 'meses' },
};

const saltarDomingo = (f, excluir) => (excluir && diaSemana(f) === 0 ? sumarDias(f, 1) : f);

/** Fecha sugerida para la primera cuota: un periodo después del desembolso. */
export function primerVencimientoSugerido(fechaInicio, frecuencia, excluirDomingos = false) {
  const f = {
    DIARIA: () => sumarDias(fechaInicio, 1),
    SEMANAL: () => sumarDias(fechaInicio, 7),
    QUINCENAL: () => sumarDias(fechaInicio, 15),
    MENSUAL: () => sumarMeses(fechaInicio, 1),
  }[frecuencia]?.();
  return f ? saltarDomingo(f, excluirDomingos && frecuencia === 'DIARIA') : fechaInicio;
}

/** Lista de fechas de vencimiento. */
export function generarFechas({ fechaPrimerVencimiento, numeroCuotas, frecuencia, excluirDomingos = false }) {
  const excluir = excluirDomingos && frecuencia === 'DIARIA';
  const fechas = [];
  let f = saltarDomingo(fechaPrimerVencimiento, excluir);
  const ancla = Number(fechaPrimerVencimiento.slice(8, 10));
  for (let i = 0; i < numeroCuotas; i++) {
    if (frecuencia === 'MENSUAL') {
      f = sumarMeses(fechaPrimerVencimiento, i, ancla);
    } else if (i > 0) {
      const paso = { DIARIA: 1, SEMANAL: 7, QUINCENAL: 15 }[frecuencia];
      f = saltarDomingo(sumarDias(f, paso), excluir);
    }
    fechas.push(f);
  }
  return fechas;
}

/** Reparte un total en n partes enteras; la última absorbe la diferencia del redondeo. */
export function repartir(total, n) {
  const base = Math.floor(total / n);
  const partes = Array(n).fill(base);
  partes[n - 1] = total - base * (n - 1);
  return partes;
}

/**
 * @returns {{numero:number, fechaVencimiento:string, capital:number, interes:number, valorProgramado:number}[]}
 */
export function generarCuotas({ montoPrestado, interesTotal, numeroCuotas, frecuencia, fechaPrimerVencimiento, excluirDomingos }) {
  if (!Number.isInteger(numeroCuotas) || numeroCuotas < 1 || numeroCuotas > 1000) {
    throw new ErrorNegocio('CUOTAS_INVALIDAS', 'El número de cuotas debe estar entre 1 y 1.000.');
  }
  if (!FRECUENCIAS[frecuencia]) throw new ErrorNegocio('FRECUENCIA', 'Selecciona una frecuencia de pago.');
  if (!esValida(fechaPrimerVencimiento)) throw new ErrorNegocio('FECHA', 'La fecha del primer vencimiento no es válida.');

  const fechas = generarFechas({ fechaPrimerVencimiento, numeroCuotas, frecuencia, excluirDomingos });
  const capitales = repartir(montoPrestado, numeroCuotas);
  const intereses = repartir(interesTotal, numeroCuotas);
  return fechas.map((fecha, i) => ({
    numero: i + 1,
    fechaVencimiento: fecha,
    capital: capitales[i],
    interes: intereses[i],
    valorProgramado: capitales[i] + intereses[i],
  }));
}
