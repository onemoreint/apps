import { type CalcResult, type Validation, InputError, requireFraction, requirePositive } from '../core/types.js';
import { AVG_DAYS_PER_MONTH, DAYS_PER_YEAR, kwToW, wToKw } from '../core/units.js';

/**
 * Recurso solar (§15). El origen del dato viaja con él: nunca se presenta
 * un dato estimado como si fuera una medición real.
 */
export interface SolarResource {
  /** Horas solares pico (kWh/m²/día). */
  peakSunHours: number;
  source: string;
  method: 'MEASURED' | 'DATABASE' | 'ESTIMATE';
  updatedAt?: string;
}

export interface SizingInput {
  /** Consumo diario promedio a cubrir (kWh/día). */
  dailyConsumptionKwh: number;
  /** Fracción del consumo a cubrir, (0, 1]. 1 = 100 %. Valores > 1 se rechazan. */
  coverage: number;
  resource: SolarResource;
  /** Potencia pico del panel seleccionado (W). */
  panelPowerW: number;
  /**
   * Performance ratio del sistema (pérdidas globales), (0, 1].
   * Lo aporta la configuración técnica o el ingeniero; el motor no asume un valor.
   */
  performanceRatio: number;
}

export interface SizingResult {
  targetDailyKwh: number;
  requiredKwp: number;
  panelCount: number;
  installedKwp: number;
  estimatedDailyKwh: number;
  estimatedMonthlyKwh: number;
  estimatedAnnualKwh: number;
  /** Cobertura real alcanzada con el número entero de paneles. */
  achievedCoverage: number;
}

export const SIZING_FORMULA =
  'potencia_sistema_kwp = (consumo_diario_kwh × cobertura) / (horas_solares_pico × performance_ratio) ; ' +
  'paneles = ⌈potencia_sistema_kwp × 1000 / potencia_panel_w⌉ ; ' +
  'producción_diaria = kWp_instalado × HSP × PR';

export function sizePvSystem(input: SizingInput): CalcResult<SizingResult> {
  const daily = requirePositive('dailyConsumptionKwh', input.dailyConsumptionKwh);
  const coverage = requireFraction('coverage', input.coverage);
  const hsp = requirePositive('resource.peakSunHours', input.resource.peakSunHours);
  if (hsp > 12) throw new InputError('resource.peakSunHours', 'valor fuera de rango físico (> 12)');
  const panelW = requirePositive('panelPowerW', input.panelPowerW);
  const pr = requireFraction('performanceRatio', input.performanceRatio);

  const target = daily * coverage;
  const requiredKwp = target / (hsp * pr);
  const panelCount = Math.ceil(kwToW(requiredKwp) / panelW - 1e-9); // tolerancia a ruido de coma flotante
  const installedKwp = wToKw(panelCount * panelW);
  const estDaily = installedKwp * hsp * pr;

  const validations: Validation[] = [];
  const assumptions: string[] = [
    `Horas solares pico = ${hsp} (fuente: ${input.resource.source}; método: ${input.resource.method}).`,
    `Performance ratio = ${pr}.`,
    'Producción mensual calculada con mes promedio de 365/12 días.',
  ];
  if (input.resource.method === 'ESTIMATE') {
    validations.push({
      code: 'SOLAR_RESOURCE_ESTIMATED',
      status: 'WARNING',
      message: 'El recurso solar es un dato estimado, no una medición. Los resultados son preliminares.',
    });
  }
  if (pr < 0.6) {
    validations.push({
      code: 'PR_UNUSUALLY_LOW',
      status: 'REVIEW_REQUIRED',
      message: 'El performance ratio indicado es bajo; verifique las pérdidas consideradas.',
    });
  }

  return {
    value: {
      targetDailyKwh: target,
      requiredKwp,
      panelCount,
      installedKwp,
      estimatedDailyKwh: estDaily,
      estimatedMonthlyKwh: estDaily * AVG_DAYS_PER_MONTH,
      estimatedAnnualKwh: estDaily * DAYS_PER_YEAR,
      achievedCoverage: estDaily / daily,
    },
    formula: SIZING_FORMULA,
    variables: [
      { name: 'consumo_diario_kwh', value: daily, unit: 'kWh/d' },
      { name: 'cobertura', value: coverage },
      { name: 'horas_solares_pico', value: hsp, unit: 'h', source: input.resource.source },
      { name: 'performance_ratio', value: pr },
      { name: 'potencia_panel_w', value: panelW, unit: 'W' },
      { name: 'potencia_sistema_kwp', value: requiredKwp, unit: 'kWp' },
    ],
    assumptions,
    validations,
  };
}

/* ───────────────────────── Escenarios (§25) ───────────────────────── */

export interface ScenarioDefinition {
  code: string;
  label: string;
  coverage: number;
}

/**
 * Genera escenarios técnicos COMPARABLES. Deliberadamente no marca ninguno como
 * "mejor", "recomendado" o "ideal": no existe una regla técnica que lo justifique.
 */
export function buildScenarios(
  base: Omit<SizingInput, 'coverage'>,
  definitions: readonly ScenarioDefinition[],
): { title: 'ESCENARIOS TÉCNICOS COMPARABLES'; scenarios: Array<ScenarioDefinition & { sizing: CalcResult<SizingResult> }> } {
  return {
    title: 'ESCENARIOS TÉCNICOS COMPARABLES',
    scenarios: definitions.map((d) => ({ ...d, sizing: sizePvSystem({ ...base, coverage: d.coverage }) })),
  };
}
