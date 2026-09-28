import { type CalcResult, type Validation, InputError, requireNonNegative } from '../core/types.js';
import { Decimal } from '../core/precision.js';
import { basisQuantity, generateBom, type BomBasis, type BomContext, type BomLine, type BomRule, type PriceEntry } from '../bom/index.js';
import { computeCosts, type CostCategory, type CostLine } from '../costs/index.js';
import { computePrice, type MarginMode, type PricingResult, type TaxRule } from '../pricing/index.js';

/**
 * Cotización con desglose completo (§21–§24):
 *   MATERIALES (línea por componente, desde reglas de BOM + precios de catálogo)
 * + MANO DE OBRA (línea por actividad, con unidad y cantidad derivada del sistema)
 * + TRANSPORTE (km × tarifa)
 * + INGENIERÍA (líneas globales)
 * + COSTOS INDIRECTOS (% sobre costos directos)
 * + OTROS (líneas libres)
 * = COSTO TOTAL → utilidad → impuestos → PRECIO DE VENTA
 *
 * Ninguna cantidad ni precio está en el código: llegan de las reglas y tarifas de la empresa.
 */

export interface LaborRule {
  id: string;
  description: string;
  /** Unidad visible: UNIDAD, METRO, HORA, GLOBAL, KM. */
  unit: string;
  basis: BomBasis;
  factor: number;
  unitCost: number;
  rounding?: 'CEIL' | 'NONE';
}

export interface FixedLine {
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

export interface QuoteInput {
  context: BomContext;
  bomRules: readonly BomRule[];
  prices: Readonly<Record<string, PriceEntry>>;
  labor: readonly LaborRule[];
  transport?: { km: number; costPerKm: number; trips?: number } | null;
  engineering?: readonly FixedLine[];
  /** Porcentaje (fracción) de costos indirectos sobre materiales + mano de obra + transporte + ingeniería. */
  indirectRate?: number;
  others?: readonly FixedLine[];
  currency: string;
  currencyDecimals: number;
  margin: number;
  marginMode: MarginMode;
  taxes: readonly TaxRule[];
}

export interface QuoteLine {
  category: CostCategory;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  total: number;
  /** Categoría de BOM (PANELES, INVERSOR, CABLE_DC…) cuando la línea es un material. */
  bomCategory?: string;
  supplier?: string | null;
  note?: string | null;
}

export interface QuoteResult {
  lines: QuoteLine[];
  subtotals: Record<CostCategory, number>;
  /** Materiales agrupados por categoría de BOM. */
  materialsByBomCategory: Record<string, number>;
  unpricedMaterials: BomLine[];
  pricing: PricingResult;
}

export function buildQuote(input: QuoteInput): CalcResult<QuoteResult> {
  const v: Validation[] = [];
  const bom = generateBom(input.bomRules, input.context, input.prices, input.currency);
  v.push(...bom.validations);

  const lines: QuoteLine[] = [];
  for (const b of bom.value.lines) {
    if (b.unitCost === null) continue;
    lines.push({
      category: 'MATERIALES',
      description: b.productName,
      quantity: b.quantity,
      unit: b.unit,
      unitCost: b.unitCost,
      total: b.totalCost!,
      bomCategory: b.category,
      supplier: b.supplier,
      note: b.note,
    });
  }

  for (const l of input.labor) {
    requireNonNegative(`labor[${l.id}].unitCost`, l.unitCost);
    requireNonNegative(`labor[${l.id}].factor`, l.factor);
    const base = basisQuantity(l.basis, input.context);
    if (base === null) {
      v.push({ code: 'LABOR_BASIS_MISSING', status: 'REVIEW_REQUIRED', message: `${l.description}: falta el dato "${l.basis}".` });
      continue;
    }
    const raw = base * l.factor;
    const qty = (l.rounding ?? 'NONE') === 'CEIL' ? Math.ceil(raw - 1e-9) : raw;
    if (qty === 0) continue;
    lines.push({
      category: 'MANO_DE_OBRA',
      description: l.description,
      quantity: qty,
      unit: l.unit,
      unitCost: l.unitCost,
      total: new Decimal(qty).times(l.unitCost).toNumber(),
    });
  }

  if (input.transport) {
    const km = requireNonNegative('transport.km', input.transport.km);
    const rate = requireNonNegative('transport.costPerKm', input.transport.costPerKm);
    const trips = input.transport.trips ?? 1;
    if (!Number.isInteger(trips) || trips < 0) throw new InputError('transport.trips', 'entero >= 0');
    const qty = km * trips;
    if (qty > 0) {
      lines.push({
        category: 'TRANSPORTE',
        description: trips > 1 ? `Transporte (${trips} viajes × ${km} km)` : `Transporte (${km} km)`,
        quantity: qty,
        unit: 'KM',
        unitCost: rate,
        total: new Decimal(qty).times(rate).toNumber(),
      });
    }
  }

  const fixed = (cat: CostCategory, arr?: readonly FixedLine[]) => {
    for (const [i, f] of (arr ?? []).entries()) {
      requireNonNegative(`${cat}[${i}].quantity`, f.quantity);
      requireNonNegative(`${cat}[${i}].unitCost`, f.unitCost);
      if (f.quantity === 0 || f.unitCost === 0) continue;
      lines.push({ category: cat, description: f.description, quantity: f.quantity, unit: f.unit, unitCost: f.unitCost,
        total: new Decimal(f.quantity).times(f.unitCost).toNumber() });
    }
  };
  fixed('INGENIERIA', input.engineering);

  const rate = input.indirectRate ?? 0;
  if (rate < 0 || rate > 1) throw new InputError('indirectRate', 'debe ser una fracción entre 0 y 1');
  if (rate > 0) {
    const base = lines.reduce((a, l) => a.plus(l.total), new Decimal(0));
    lines.push({
      category: 'COSTOS_INDIRECTOS',
      description: `Costos indirectos (${new Decimal(rate).times(100).toString()} % de costos directos)`,
      quantity: 1,
      unit: 'GLOBAL',
      unitCost: base.times(rate).toNumber(),
      total: base.times(rate).toNumber(),
    });
  }
  fixed('OTROS', input.others);

  const costs = computeCosts(
    lines.map<CostLine>((l) => ({ category: l.category, description: l.description, quantity: l.quantity, unit: l.unit, unitCost: l.unitCost })),
  );
  const price = computePrice({
    totalCost: costs.value.totalCost,
    margin: input.margin,
    marginMode: input.marginMode,
    taxes: input.taxes,
    currency: input.currency,
    currencyDecimals: input.currencyDecimals,
  });
  v.push(...price.validations);

  return {
    value: {
      lines,
      subtotals: costs.value.byCategory,
      materialsByBomCategory: bom.value.totalsByCategory,
      unpricedMaterials: bom.value.lines.filter((l) => l.unitCost === null),
      pricing: price.value,
    },
    formula:
      'material = ⌈base × factor⌉ × precio ; mano_de_obra = base × factor × tarifa ; transporte = km × viajes × tarifa ; ' +
      'indirectos = % × (materiales + mano de obra + transporte + ingeniería) ; COSTO TOTAL = Σ categorías ; ' +
      price.formula,
    variables: [
      { name: 'paneles', value: input.context.panels },
      { name: 'strings', value: input.context.strings },
      { name: 'kwp_instalado', value: input.context.installedKwp, unit: 'kWp' },
      { name: 'baterias', value: input.context.batteries },
      { name: 'metros_dc', value: input.context.dcCableMeters ?? null, unit: 'm' },
      { name: 'metros_ac', value: input.context.acCableMeters ?? null, unit: 'm' },
      { name: 'costo_total', value: costs.value.totalCost, unit: input.currency },
    ],
    assumptions: [...bom.assumptions, ...price.assumptions],
    validations: v,
  };
}
