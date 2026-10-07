import { toCents } from '@/shared/lib/money';

export interface CartOption {
  id: string;
  name: string;
  groupName: string;
  deltaCents: number;
}

export interface CartLine {
  key: string; // producto + opciones elegidas (misma combinación = misma línea)
  productId: string;
  name: string;
  baseCents: number;
  options: CartOption[];
  quantity: number;
}

export const MAX_QTY = 20;
export const MAX_LINES = 30;
export const MAX_NOTES = 280;

export function lineKey(productId: string, optionIds: string[]): string {
  return `${productId}|${[...optionIds].sort().join(',')}`;
}

export function unitCents(line: Pick<CartLine, 'baseCents' | 'options'>): number {
  return line.baseCents + line.options.reduce((s, o) => s + o.deltaCents, 0);
}

export function lineTotalCents(line: CartLine): number {
  return unitCents(line) * line.quantity;
}

export interface CartTotals {
  subtotalCents: number;
  extrasCents: number;
  totalCents: number;
  count: number;
}

export function cartTotals(lines: CartLine[]): CartTotals {
  let subtotalCents = 0;
  let extrasCents = 0;
  let count = 0;
  for (const l of lines) {
    subtotalCents += l.baseCents * l.quantity;
    extrasCents += l.options.reduce((s, o) => s + o.deltaCents, 0) * l.quantity;
    count += l.quantity;
  }
  return { subtotalCents, extrasCents, totalCents: subtotalCents + extrasCents, count };
}

export const clampQty = (n: number): number => Math.max(1, Math.min(MAX_QTY, Math.floor(n)));

export { toCents };
