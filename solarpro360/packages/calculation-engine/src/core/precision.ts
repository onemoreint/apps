import Decimal from 'decimal.js';

/**
 * Reglas de precisión (§41):
 *  - Los cálculos internos usan precisión completa (nunca se redondea a mitad de cálculo).
 *  - El redondeo se aplica SOLO al presentar o persistir un resultado final.
 *  - Los decimales de moneda los define el país/moneda configurada (tabla `currencies`),
 *    nunca el código.
 */

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

/** Redondeo para mostrar un valor técnico con precisión configurable. */
export function roundForDisplay(value: number, decimals: number): number {
  if (!Number.isInteger(decimals) || decimals < 0) throw new RangeError('decimals debe ser entero >= 0');
  return new Decimal(value).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber();
}

/** Redondeo monetario según los decimales de la moneda configurada (p. ej. COP = 0, USD = 2). */
export function roundCurrency(amount: Decimal.Value, currencyDecimals: number): number {
  if (!Number.isInteger(currencyDecimals) || currencyDecimals < 0) {
    throw new RangeError('currencyDecimals debe ser entero >= 0');
  }
  return new Decimal(amount).toDecimalPlaces(currencyDecimals, Decimal.ROUND_HALF_UP).toNumber();
}

/** Suma exacta de importes (evita errores de coma flotante al acumular). */
export function sumMoney(values: readonly Decimal.Value[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(v), new Decimal(0));
}
