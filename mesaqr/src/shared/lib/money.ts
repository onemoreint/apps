/**
 * Dinero. USD es la fuente de verdad. Internamente se trabaja en centavos
 * enteros para evitar errores de coma flotante (0.1 + 0.2).
 */

export const toCents = (usd: number | string): number => Math.round(Number(usd) * 100);
export const fromCents = (cents: number): number => cents / 100;

const usdFmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const bsFmt = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** $7.00 */
export function formatUsd(usd: number): string {
  return `$${usdFmt.format(usd)}`;
}

/** Bs. 2.800,00 */
export function formatBs(bs: number): string {
  return `Bs. ${bsFmt.format(bs)}`;
}

/** USD → Bs. redondeado a céntimos. Tasa inválida → null (no se muestra). */
export function usdToBs(usd: number, rate: number): number | null {
  if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(usd)) return null;
  return Math.round(usd * rate * 100) / 100;
}

/** "≈ Bs. 700,00" o null si no corresponde mostrarlo. */
export function bsLabel(usd: number, rate: number, show: boolean): string | null {
  if (!show) return null;
  const bs = usdToBs(usd, rate);
  return bs === null ? null : `≈ ${formatBs(bs)}`;
}

/** +$1.00 · Gratis no se muestra */
export function formatDelta(usd: number): string {
  return usd > 0 ? `+${formatUsd(usd)}` : '';
}
