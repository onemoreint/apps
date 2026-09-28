import { type CalcResult, type Validation, InputError, requireNonNegative } from '../core/types.js';
import { Decimal, roundCurrency, sumMoney } from '../core/precision.js';

/**
 * Modo de margen — debe ser explícito, porque "30 % de margen" significa cosas distintas:
 *  - MARKUP:       utilidad = costo × margen                (precio_sin_imp = costo × (1 + m))
 *  - GROSS_MARGIN: utilidad = costo / (1 − margen) − costo  (utilidad / precio_sin_imp = m)
 */
export type MarginMode = 'MARKUP' | 'GROSS_MARGIN';

export interface TaxRule {
  code: string;
  name: string;
  /** Tasa como fracción (0.19 = 19 %). Viene de `tax_rules` del país/empresa, nunca del código. */
  rate: number;
}

export interface PricingInput {
  totalCost: number;
  margin: number;
  marginMode: MarginMode;
  taxes: readonly TaxRule[];
  currency: string;
  /** Decimales de la moneda (de la tabla `currencies`). */
  currencyDecimals: number;
}

export interface PricingResult {
  costo_total: number;
  margen: number;
  margin_mode: MarginMode;
  utilidad: number;
  subtotal: number;
  impuestos: number;
  impuestos_detalle: Array<{ code: string; name: string; rate: number; amount: number }>;
  precio_final: number;
  currency: string;
  /** Valores redondeados a los decimales de la moneda, para persistir y mostrar. */
  rounded: { costo_total: number; utilidad: number; subtotal: number; impuestos: number; precio_final: number };
}

export function computePrice(input: PricingInput): CalcResult<PricingResult> {
  const cost = new Decimal(requireNonNegative('totalCost', input.totalCost));
  const m = requireNonNegative('margin', input.margin);
  if (input.marginMode === 'GROSS_MARGIN' && m >= 1) {
    throw new InputError('margin', 'en modo GROSS_MARGIN debe ser menor que 1');
  }

  const utility =
    input.marginMode === 'MARKUP' ? cost.times(m) : cost.div(new Decimal(1).minus(m)).minus(cost);
  const subtotal = cost.plus(utility);

  const taxDetail = input.taxes.map((t, i) => {
    requireNonNegative(`taxes[${i}].rate`, t.rate);
    if (t.rate > 1) throw new InputError(`taxes[${i}].rate`, 'debe expresarse como fracción (0.19 = 19 %)');
    return { code: t.code, name: t.name, rate: t.rate, amount: subtotal.times(t.rate) };
  });
  const taxes = sumMoney(taxDetail.map((t) => t.amount));
  const final = subtotal.plus(taxes);

  const d = input.currencyDecimals;
  const v: Validation[] = [];
  if (input.taxes.length === 0) {
    v.push({
      code: 'NO_TAXES_CONFIGURED',
      status: 'REVIEW_REQUIRED',
      message: 'No hay impuestos configurados para este presupuesto. Verifique si aplica alguno.',
    });
  }

  return {
    value: {
      costo_total: cost.toNumber(),
      margen: m,
      margin_mode: input.marginMode,
      utilidad: utility.toNumber(),
      subtotal: subtotal.toNumber(),
      impuestos: taxes.toNumber(),
      impuestos_detalle: taxDetail.map((t) => ({ ...t, amount: t.amount.toNumber() })),
      precio_final: final.toNumber(),
      currency: input.currency,
      rounded: {
        costo_total: roundCurrency(cost, d),
        utilidad: roundCurrency(utility, d),
        subtotal: roundCurrency(subtotal, d),
        impuestos: roundCurrency(taxes, d),
        precio_final: roundCurrency(final, d),
      },
    },
    formula:
      input.marginMode === 'MARKUP'
        ? 'utilidad = costo × margen ; subtotal = costo + utilidad ; impuestos = Σ subtotal × tasa ; precio_final = subtotal + impuestos'
        : 'utilidad = costo / (1 − margen) − costo ; subtotal = costo + utilidad ; impuestos = Σ subtotal × tasa ; precio_final = subtotal + impuestos',
    variables: [
      { name: 'costo_total', value: cost.toNumber(), unit: input.currency },
      { name: 'margen', value: m },
      { name: 'modo_margen', value: input.marginMode },
    ],
    assumptions: ['Los impuestos se aplican sobre el subtotal (costo + utilidad).'],
    validations: v,
  };
}
