import { type CalcResult, requireNonNegative } from '../core/types.js';
import { Decimal, sumMoney } from '../core/precision.js';

/** Categorías obligatorias de costo (§23). */
export const COST_CATEGORIES = [
  'MATERIALES',
  'MANO_DE_OBRA',
  'TRANSPORTE',
  'INGENIERIA',
  'COSTOS_INDIRECTOS',
  'OTROS',
] as const;
export type CostCategory = (typeof COST_CATEGORIES)[number];

export interface CostLine {
  category: CostCategory;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

export interface CostBreakdown {
  byCategory: Record<CostCategory, number>;
  lines: Array<CostLine & { total: number }>;
  totalCost: number;
}

export function computeCosts(lines: readonly CostLine[]): CalcResult<CostBreakdown> {
  const byCategory = Object.fromEntries(COST_CATEGORIES.map((c) => [c, new Decimal(0)])) as Record<
    CostCategory,
    Decimal
  >;
  const out = lines.map((l, i) => {
    if (!COST_CATEGORIES.includes(l.category)) throw new Error(`lines[${i}].category inválida: ${l.category}`);
    requireNonNegative(`lines[${i}].quantity`, l.quantity);
    requireNonNegative(`lines[${i}].unitCost`, l.unitCost);
    const total = new Decimal(l.quantity).times(l.unitCost);
    byCategory[l.category] = byCategory[l.category].plus(total);
    return { ...l, total: total.toNumber() };
  });

  const totals = Object.fromEntries(COST_CATEGORIES.map((c) => [c, byCategory[c].toNumber()])) as Record<
    CostCategory,
    number
  >;

  return {
    value: {
      byCategory: totals,
      lines: out,
      totalCost: sumMoney(Object.values(byCategory)).toNumber(),
    },
    formula:
      'COSTO TOTAL = MATERIALES + MANO DE OBRA + TRANSPORTE + INGENIERÍA + COSTOS INDIRECTOS + OTROS ; línea = cantidad × costo_unitario',
    variables: COST_CATEGORIES.map((c) => ({ name: c.toLowerCase(), value: totals[c] })),
    assumptions: [],
    validations: [],
  };
}
