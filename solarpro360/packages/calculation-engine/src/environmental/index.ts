import { type CalcResult, requireNonNegative } from '../core/types.js';

export interface EmissionFactor {
  /** kg CO₂ por kWh de la red. */
  kgCo2PerKwh: number;
  source: string;
  year?: number | null;
}

/**
 * CO₂ evitado estimado. El factor de emisión de la red se configura por país con su fuente;
 * si no existe, el motor NO inventa uno: devuelve null y pide revisión.
 */
export function co2Avoided(annualKwh: number, factor: EmissionFactor | null | undefined): CalcResult<{ annualKgCo2: number | null }> {
  const kwh = requireNonNegative('annualKwh', annualKwh);
  if (!factor) {
    return {
      value: { annualKgCo2: null },
      formula: 'CO₂_evitado = energía_anual × factor_emisión_red',
      variables: [{ name: 'energia_anual', value: kwh, unit: 'kWh' }],
      assumptions: [],
      validations: [
        {
          code: 'EMISSION_FACTOR_MISSING',
          status: 'REVIEW_REQUIRED',
          message: 'No hay información suficiente para determinar este valor: falta el factor de emisión de la red.',
        },
      ],
    };
  }
  const f = requireNonNegative('factor.kgCo2PerKwh', factor.kgCo2PerKwh);
  return {
    value: { annualKgCo2: kwh * f },
    formula: 'CO₂_evitado = energía_anual × factor_emisión_red',
    variables: [
      { name: 'energia_anual', value: kwh, unit: 'kWh' },
      { name: 'factor_emision', value: f, unit: 'kgCO₂/kWh', source: factor.source },
    ],
    assumptions: [`Factor de emisión: ${f} kgCO₂/kWh (fuente: ${factor.source}${factor.year ? `, ${factor.year}` : ''}).`],
    validations: [],
  };
}
