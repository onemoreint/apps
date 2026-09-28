import { type CalcResult, type Validation, InputError, requireNonNegative, requirePositive } from '../core/types.js';
import { AVG_DAYS_PER_MONTH, MONTHS_PER_YEAR, whToKwh } from '../core/units.js';

/* ───────────────────────── Método B: consumo manual (§13) ───────────────────────── */

export interface MonthlyConsumption {
  /** Identificador del periodo, p. ej. "2026-01". */
  period: string;
  /** Consumo en kWh. `null` = dato no disponible (NUNCA se trata como cero). */
  kwh: number | null;
  /** Días reales del periodo facturado, si se conocen. */
  days?: number | null;
}

export interface ConsumptionStats {
  monthsProvided: number;
  monthsWithData: number;
  missingPeriods: string[];
  averageMonthlyKwh: number;
  averageDailyKwh: number;
  /** Anual estimado = promedio mensual × 12 (si hay menos de 12 meses es una extrapolación). */
  annualKwh: number;
  minMonthlyKwh: number;
  maxMonthlyKwh: number;
  /** (máx − mín) / promedio. */
  variationRatio: number;
  /** Desviación estándar poblacional / promedio. */
  coefficientOfVariation: number;
}

export function consumptionStats(entries: readonly MonthlyConsumption[]): CalcResult<ConsumptionStats> {
  if (entries.length === 0) throw new InputError('entries', 'se requiere al menos un periodo');

  const withData = entries.filter((e) => e.kwh !== null && e.kwh !== undefined);
  const missing = entries.filter((e) => e.kwh === null || e.kwh === undefined).map((e) => e.period);
  if (withData.length === 0) throw new InputError('entries', 'ningún periodo tiene consumo disponible');

  const values = withData.map((e) => requireNonNegative(`kwh[${e.period}]`, e.kwh));
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;

  // Si todos los periodos traen días reales, el promedio diario usa los días reales.
  const allHaveDays = withData.every((e) => typeof e.days === 'number' && e.days > 0);
  const totalDays = allHaveDays ? withData.reduce((a, e) => a + (e.days as number), 0) : null;
  const avgDaily = totalDays ? sum / totalDays : avg / AVG_DAYS_PER_MONTH;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const variance = values.reduce((a, v) => a + (v - avg) ** 2, 0) / values.length;

  const validations: Validation[] = [];
  const assumptions: string[] = [];
  if (missing.length > 0) {
    validations.push({
      code: 'CONSUMPTION_MISSING_PERIODS',
      status: 'WARNING',
      message: `Hay ${missing.length} periodo(s) sin dato; se excluyen del promedio (no se asumen como cero).`,
    });
  }
  if (withData.length < MONTHS_PER_YEAR) {
    assumptions.push(
      `Consumo anual extrapolado a partir de ${withData.length} mes(es): promedio mensual × 12.`,
    );
  }
  if (!totalDays) assumptions.push('Promedio diario calculado con mes promedio de 365/12 días.');

  return {
    value: {
      monthsProvided: entries.length,
      monthsWithData: withData.length,
      missingPeriods: missing,
      averageMonthlyKwh: avg,
      averageDailyKwh: avgDaily,
      annualKwh: avg * MONTHS_PER_YEAR,
      minMonthlyKwh: min,
      maxMonthlyKwh: max,
      variationRatio: avg > 0 ? (max - min) / avg : 0,
      coefficientOfVariation: avg > 0 ? Math.sqrt(variance) / avg : 0,
    },
    formula:
      'promedio_mensual = Σ kWh / n ; promedio_diario = Σ kWh / Σ días (o promedio_mensual / (365/12)) ; anual = promedio_mensual × 12',
    variables: [
      { name: 'n_periodos_con_dato', value: withData.length },
      { name: 'suma_kwh', value: sum, unit: 'kWh' },
      { name: 'dias_totales', value: totalDays, unit: 'd' },
    ],
    assumptions,
    validations,
  };
}

/* ───────────────────────── Inventario de cargas (§14) ───────────────────────── */

export interface Load {
  name: string;
  category?: string;
  powerW: number;
  quantity: number;
  hoursPerDay: number;
  daysPerMonth: number;
  /** Factor de uso en [0, 1]. Por defecto 1 (uso pleno durante las horas indicadas). */
  usageFactor?: number;
}

export interface LoadLine extends Load {
  dailyKwh: number;
  monthlyKwh: number;
}

export interface LoadInventoryResult {
  lines: LoadLine[];
  totalMonthlyKwh: number;
  totalDailyKwhAverage: number;
  installedPowerW: number;
}

export function loadInventory(loads: readonly Load[]): CalcResult<LoadInventoryResult> {
  const lines: LoadLine[] = loads.map((l, i) => {
    const p = requireNonNegative(`loads[${i}].powerW`, l.powerW);
    const q = requireNonNegative(`loads[${i}].quantity`, l.quantity);
    const h = requireNonNegative(`loads[${i}].hoursPerDay`, l.hoursPerDay);
    const d = requireNonNegative(`loads[${i}].daysPerMonth`, l.daysPerMonth);
    if (h > 24) throw new InputError(`loads[${i}].hoursPerDay`, 'no puede superar 24');
    if (d > 31) throw new InputError(`loads[${i}].daysPerMonth`, 'no puede superar 31');
    const f = l.usageFactor ?? 1;
    if (f < 0 || f > 1) throw new InputError(`loads[${i}].usageFactor`, 'debe estar en [0, 1]');

    const dailyKwh = whToKwh(p * q * h * f);
    return { ...l, usageFactor: f, dailyKwh, monthlyKwh: dailyKwh * d };
  });

  const totalMonthly = lines.reduce((a, l) => a + l.monthlyKwh, 0);
  return {
    value: {
      lines,
      totalMonthlyKwh: totalMonthly,
      totalDailyKwhAverage: totalMonthly / AVG_DAYS_PER_MONTH,
      installedPowerW: lines.reduce((a, l) => a + l.powerW * l.quantity, 0),
    },
    formula: 'Energía mensual (kWh) = Potencia (W) × Cantidad × Horas/día × Días/mes × Factor de uso ÷ 1000',
    variables: [{ name: 'numero_cargas', value: lines.length }],
    assumptions: loads.some((l) => l.usageFactor === undefined)
      ? ['Cargas sin factor de uso declarado se calculan con factor 1.']
      : [],
    validations: [],
  };
}

/* ───────────────────────── Declarado vs calculado (§14) ───────────────────────── */

export const CONSUMPTION_MISMATCH_MESSAGE =
  'Existe una diferencia entre el consumo declarado y el consumo estimado mediante cargas. Revise los datos introducidos.';

export interface ConsumptionComparison {
  declaredMonthlyKwh: number;
  calculatedMonthlyKwh: number;
  differenceKwh: number;
  /** |calculado − declarado| / declarado */
  differenceRatio: number;
  thresholdRatio: number;
  significant: boolean;
}

/**
 * @param thresholdRatio Umbral configurable por empresa (p. ej. 0.2 = 20 %). No tiene valor por defecto
 *                       en el motor: lo aporta la configuración.
 */
export function compareDeclaredVsLoads(
  declaredMonthlyKwh: number,
  calculatedMonthlyKwh: number,
  thresholdRatio: number,
): CalcResult<ConsumptionComparison> {
  const declared = requirePositive('declaredMonthlyKwh', declaredMonthlyKwh);
  const calculated = requireNonNegative('calculatedMonthlyKwh', calculatedMonthlyKwh);
  const threshold = requireNonNegative('thresholdRatio', thresholdRatio);

  const diff = calculated - declared;
  const ratio = Math.abs(diff) / declared;
  const significant = ratio > threshold;

  return {
    value: {
      declaredMonthlyKwh: declared,
      calculatedMonthlyKwh: calculated,
      differenceKwh: diff,
      differenceRatio: ratio,
      thresholdRatio: threshold,
      significant,
    },
    formula: 'diferencia_relativa = |calculado − declarado| / declarado ; significativa si > umbral',
    variables: [
      { name: 'declarado', value: declared, unit: 'kWh/mes' },
      { name: 'calculado', value: calculated, unit: 'kWh/mes' },
      { name: 'umbral', value: threshold },
    ],
    assumptions: [],
    validations: significant
      ? [{ code: 'CONSUMPTION_MISMATCH', status: 'WARNING', message: CONSUMPTION_MISMATCH_MESSAGE }]
      : [{ code: 'CONSUMPTION_MATCH', status: 'OK', message: 'Consumo declarado y estimado son coherentes.' }],
  };
}
