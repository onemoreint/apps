import { type CalcResult, requireNonNegative, requirePositive, InputError } from '../core/types.js';
import { Decimal } from '../core/precision.js';

export const ROI_DISCLAIMER =
  'Proyección financiera estimada con los supuestos indicados. No constituye una garantía de ahorro ni de rendimiento.';

export interface RoiInput {
  investment: number;
  /** Producción del primer año (kWh). */
  firstYearProductionKwh: number;
  /** Fracción de la producción que efectivamente sustituye energía comprada, (0, 1]. */
  selfConsumptionRatio: number;
  /** Tarifa de energía del primer año (moneda/kWh). */
  tariffPerKwh: number;
  /** Incremento tarifario anual (fracción). */
  tariffEscalation: number;
  /** Degradación anual de producción (fracción). */
  annualDegradation: number;
  /** Costo de mantenimiento del primer año (moneda). */
  annualMaintenance: number;
  /** Incremento anual del mantenimiento (fracción). */
  maintenanceEscalation?: number;
  /** Vida útil asumida (años). */
  lifetimeYears: number;
  /** Reemplazos programados (p. ej. inversor en el año 12). */
  replacements?: Array<{ year: number; cost: number; description: string }>;
  /** Otros costos anuales fijos (seguros, monitoreo, cuota de financiación…). */
  otherAnnualCosts?: number;
}

export interface RoiYear {
  year: number;
  productionKwh: number;
  tariff: number;
  grossSavings: number;
  costs: number;
  netSavings: number;
  cumulative: number;
}

export interface RoiResult {
  monthlySavingsYear1: number;
  annualSavingsYear1: number;
  simplePaybackYears: number | null;
  /** Año (fraccional) en que el flujo acumulado se vuelve positivo. null = no se recupera en la vida útil. */
  cumulativePaybackYears: number | null;
  horizons: Record<'5' | '10' | '15' | '20', number | null>;
  years: RoiYear[];
  disclaimer: string;
}

export function computeRoi(input: RoiInput): CalcResult<RoiResult> {
  const inv = requirePositive('investment', input.investment);
  const prod = requireNonNegative('firstYearProductionKwh', input.firstYearProductionKwh);
  const sc = input.selfConsumptionRatio;
  if (!(sc > 0 && sc <= 1)) throw new InputError('selfConsumptionRatio', 'debe estar en (0, 1]');
  const tariff0 = requireNonNegative('tariffPerKwh', input.tariffPerKwh);
  const esc = input.tariffEscalation;
  const deg = requireNonNegative('annualDegradation', input.annualDegradation);
  if (deg >= 1) throw new InputError('annualDegradation', 'debe ser menor que 1');
  const maint0 = requireNonNegative('annualMaintenance', input.annualMaintenance);
  const maintEsc = input.maintenanceEscalation ?? 0;
  const life = input.lifetimeYears;
  if (!Number.isInteger(life) || life < 1 || life > 50) throw new InputError('lifetimeYears', 'entero entre 1 y 50');
  const other = requireNonNegative('otherAnnualCosts', input.otherAnnualCosts ?? 0);

  const years: RoiYear[] = [];
  let cumulative = new Decimal(inv).negated();
  let payback: number | null = null;

  for (let y = 1; y <= life; y++) {
    const production = new Decimal(prod).times(new Decimal(1).minus(deg).pow(y - 1));
    const tariff = new Decimal(tariff0).times(new Decimal(1).plus(esc).pow(y - 1));
    const gross = production.times(sc).times(tariff);
    const replacement = (input.replacements ?? [])
      .filter((r) => r.year === y)
      .reduce((a, r) => a.plus(requireNonNegative('replacement.cost', r.cost)), new Decimal(0));
    const costs = new Decimal(maint0).times(new Decimal(1).plus(maintEsc).pow(y - 1)).plus(other).plus(replacement);
    const net = gross.minus(costs);
    const prev = cumulative;
    cumulative = cumulative.plus(net);

    if (payback === null && prev.lt(0) && cumulative.gte(0) && net.gt(0)) {
      payback = y - 1 + prev.negated().div(net).toNumber();
    }
    years.push({
      year: y,
      productionKwh: production.toNumber(),
      tariff: tariff.toNumber(),
      grossSavings: gross.toNumber(),
      costs: costs.toNumber(),
      netSavings: net.toNumber(),
      cumulative: cumulative.toNumber(),
    });
  }

  const first = years[0]!;
  const horizon = (n: number) => (n <= life ? years[n - 1]!.cumulative : null);

  return {
    value: {
      monthlySavingsYear1: first.grossSavings / 12,
      annualSavingsYear1: first.grossSavings,
      simplePaybackYears: first.netSavings > 0 ? inv / first.netSavings : null,
      cumulativePaybackYears: payback,
      horizons: { '5': horizon(5), '10': horizon(10), '15': horizon(15), '20': horizon(20) },
      years,
      disclaimer: ROI_DISCLAIMER,
    },
    formula:
      'producción_año_n = P₁ × (1 − degradación)^(n−1) ; tarifa_n = T₁ × (1 + incremento)^(n−1) ; ahorro_n = producción_n × autoconsumo × tarifa_n ; ' +
      'neto_n = ahorro_n − mantenimiento_n − otros − reemplazos_n ; recuperación_simple = inversión / neto_año_1',
    variables: [
      { name: 'inversion', value: inv },
      { name: 'produccion_año_1', value: prod, unit: 'kWh' },
      { name: 'autoconsumo', value: sc },
      { name: 'tarifa_año_1', value: tariff0 },
      { name: 'incremento_tarifario', value: esc },
      { name: 'degradacion', value: deg },
      { name: 'mantenimiento_año_1', value: maint0 },
      { name: 'vida_util', value: life, unit: 'años' },
    ],
    assumptions: [
      ROI_DISCLAIMER,
      `Vida útil asumida: ${life} años.`,
      'Sin valor del dinero en el tiempo (no se descuenta el flujo).',
    ],
    validations: [],
  };
}
