import { type CalcResult, type Validation, InputError, requireNonNegative } from '../core/types.js';
import { Decimal, sumMoney } from '../core/precision.js';

export type BomBasis =
  | 'PER_PANEL'
  | 'PER_STRING'
  | 'PER_INVERTER'
  | 'PER_BATTERY'
  | 'PER_KWP'
  | 'PER_METER_DC'
  | 'PER_METER_AC'
  | 'FIXED';

/**
 * Regla de BOM configurable por empresa: "por cada <basis> usar <factor> unidades de <producto>".
 * Ej.: 4 grapas por panel. El motor no trae proporciones de fábrica: las define la empresa.
 */
export interface BomRule {
  id: string;
  category: string;
  productId: string;
  productName: string;
  unit: string;
  basis: BomBasis;
  factor: number;
  /** Redondeo de la cantidad resultante: siempre hacia arriba por defecto (no se compran fracciones). */
  rounding?: 'CEIL' | 'NONE';
}

export interface BomContext {
  panels: number;
  strings: number;
  inverters: number;
  batteries: number;
  installedKwp: number;
  dcCableMeters?: number | null;
  acCableMeters?: number | null;
}

export interface PriceEntry {
  unitCost: number;
  currency: string;
  supplier?: string | null;
  /** Fecha del precio: el proyecto histórico conserva este valor aunque el catálogo cambie. */
  priceDate?: string | null;
}

export interface BomLine {
  ruleId?: string;
  category: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitCost: number | null;
  totalCost: number | null;
  currency: string | null;
  supplier: string | null;
  note: string | null;
}

function basisQuantity(basis: BomBasis, ctx: BomContext): number | null {
  switch (basis) {
    case 'PER_PANEL':
      return ctx.panels;
    case 'PER_STRING':
      return ctx.strings;
    case 'PER_INVERTER':
      return ctx.inverters;
    case 'PER_BATTERY':
      return ctx.batteries;
    case 'PER_KWP':
      return ctx.installedKwp;
    case 'PER_METER_DC':
      return ctx.dcCableMeters ?? null;
    case 'PER_METER_AC':
      return ctx.acCableMeters ?? null;
    case 'FIXED':
      return 1;
  }
}

export function generateBom(
  rules: readonly BomRule[],
  ctx: BomContext,
  prices: Readonly<Record<string, PriceEntry>>,
  currency: string,
): CalcResult<{ lines: BomLine[]; totalCost: number; totalsByCategory: Record<string, number>; unpricedCount: number }> {
  const v: Validation[] = [];
  const lines: BomLine[] = [];

  for (const r of rules) {
    requireNonNegative(`rules[${r.id}].factor`, r.factor);
    const base = basisQuantity(r.basis, ctx);
    if (base === null) {
      v.push({
        code: 'BOM_BASIS_MISSING',
        status: 'REVIEW_REQUIRED',
        message: `${r.productName}: falta el dato "${r.basis}" para calcular la cantidad.`,
      });
      continue;
    }
    const raw = base * r.factor;
    const qty = (r.rounding ?? 'CEIL') === 'CEIL' ? Math.ceil(raw - 1e-9) : raw;
    if (qty === 0) continue;

    const price = prices[r.productId];
    let unitCost: number | null = null;
    let note: string | null = null;
    if (!price) {
      note = 'Sin precio en catálogo';
      v.push({ code: 'BOM_PRICE_MISSING', status: 'WARNING', message: `${r.productName}: sin precio registrado.` });
    } else if (price.currency !== currency) {
      note = `Precio en ${price.currency}; requiere conversión a ${currency}`;
      v.push({
        code: 'BOM_CURRENCY_MISMATCH',
        status: 'REVIEW_REQUIRED',
        message: `${r.productName}: precio en ${price.currency}, presupuesto en ${currency}. Se requiere tasa de cambio.`,
      });
    } else {
      unitCost = price.unitCost;
    }

    lines.push({
      ruleId: r.id,
      category: r.category,
      productId: r.productId,
      productName: r.productName,
      quantity: qty,
      unit: r.unit,
      unitCost,
      totalCost: unitCost === null ? null : new Decimal(unitCost).times(qty).toNumber(),
      currency: unitCost === null ? null : currency,
      supplier: price?.supplier ?? null,
      note,
    });
  }

  const totalsByCategory: Record<string, number> = {};
  for (const l of lines) {
    if (l.totalCost === null) continue;
    totalsByCategory[l.category] = new Decimal(totalsByCategory[l.category] ?? 0).plus(l.totalCost).toNumber();
  }
  const priced = lines.filter((l) => l.totalCost !== null).map((l) => l.totalCost as number);

  return {
    value: {
      lines,
      totalCost: sumMoney(priced).toNumber(),
      totalsByCategory,
      unpricedCount: lines.length - priced.length,
    },
    formula: 'cantidad = ⌈base(regla) × factor⌉ ; costo_total_línea = cantidad × costo_unitario',
    variables: [
      { name: 'paneles', value: ctx.panels },
      { name: 'strings', value: ctx.strings },
      { name: 'inversores', value: ctx.inverters },
      { name: 'baterias', value: ctx.batteries },
    ],
    assumptions: ['Las líneas sin precio no suman al total; se marcan para revisión.'],
    validations: v,
  };
}

/** Validación simple de líneas manuales (cantidad y costo no negativos). */
export function assertBomLine(line: Pick<BomLine, 'quantity' | 'unitCost'>, idx: number): void {
  requireNonNegative(`lines[${idx}].quantity`, line.quantity);
  if (line.unitCost !== null && line.unitCost < 0) throw new InputError(`lines[${idx}].unitCost`, 'no puede ser negativo');
}
