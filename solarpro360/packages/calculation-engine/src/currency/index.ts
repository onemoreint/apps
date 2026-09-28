import { type CalcResult, type Validation, InputError, requireNonNegative, requirePositive } from '../core/types.js';
import { Decimal, roundCurrency } from '../core/precision.js';

/**
 * Conversión a moneda local con tasa oficial + recargo por unidad.
 *
 * Caso Venezuela: se cotiza en USD y el precio final en bolívares usa
 *   tasa_aplicada = tasa_BCV + recargo   (recargo configurable por empresa; por defecto 200 Bs/USD)
 *   precio_final_Bs = precio_USD × tasa_aplicada
 *
 * La tasa oficial NUNCA está en el código: llega de la tabla `exchange_rates` con su fecha y fuente.
 */
export interface LocalConversionInput {
  /** Monto en la moneda de cotización (p. ej. precio_final en USD, sin redondear). */
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  /** Tasa oficial: unidades de moneda local por 1 unidad de la moneda de cotización. */
  officialRate: number;
  rateSource: string;
  /** Fecha de la tasa (YYYY-MM-DD). */
  rateDate: string;
  /** Recargo sumado a la tasa oficial, en moneda local por unidad (p. ej. 200 Bs/USD). */
  surchargePerUnit: number;
  /** Decimales de la moneda local (tabla `currencies`). */
  toDecimals: number;
  /** Fecha de la cotización, para advertir si la tasa no es del mismo día. */
  quoteDate?: string;
}

export interface LocalConversionResult {
  appliedRate: number;
  localAmount: number;
  localAmountRounded: number;
  currency: string;
}

export const LOCAL_CONVERSION_FORMULA =
  'tasa_aplicada = tasa_oficial + recargo_por_unidad ; precio_final_local = monto × tasa_aplicada';

export function convertToLocal(input: LocalConversionInput): CalcResult<LocalConversionResult> {
  const amount = requireNonNegative('amount', input.amount);
  const rate = requirePositive('officialRate', input.officialRate);
  const surcharge = requireNonNegative('surchargePerUnit', input.surchargePerUnit);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.rateDate)) throw new InputError('rateDate', 'formato YYYY-MM-DD');
  if (input.fromCurrency === input.toCurrency) throw new InputError('toCurrency', 'debe ser distinta de la moneda de cotización');

  const applied = new Decimal(rate).plus(surcharge);
  const local = new Decimal(amount).times(applied);

  const v: Validation[] = [];
  if (input.quoteDate && input.quoteDate !== input.rateDate) {
    v.push({
      code: 'FX_RATE_NOT_SAME_DAY',
      status: 'WARNING',
      message: `La tasa ${input.rateSource} es del ${input.rateDate} y la cotización del ${input.quoteDate}. Actualice la tasa.`,
    });
  }

  return {
    value: {
      appliedRate: applied.toNumber(),
      localAmount: local.toNumber(),
      localAmountRounded: roundCurrency(local, input.toDecimals),
      currency: input.toCurrency,
    },
    formula: LOCAL_CONVERSION_FORMULA,
    variables: [
      { name: 'monto', value: amount, unit: input.fromCurrency },
      { name: 'tasa_oficial', value: rate, unit: `${input.toCurrency}/${input.fromCurrency}`, source: `${input.rateSource} ${input.rateDate}` },
      { name: 'recargo_por_unidad', value: surcharge, unit: `${input.toCurrency}/${input.fromCurrency}` },
    ],
    assumptions: [
      `Tasa ${input.rateSource} del ${input.rateDate}: ${rate} ${input.toCurrency}/${input.fromCurrency}, más recargo de ${surcharge} ${input.toCurrency} por ${input.fromCurrency}.`,
      'El precio en moneda local es el precio final.',
    ],
    validations: v,
  };
}
