import { bsLabel, formatUsd, fromCents } from '@/shared/lib/money';
import type { CartTotals } from './cartMath';

interface Props {
  totals: CartTotals;
  rate: number;
  showBs: boolean;
}

export function CartSummary({ totals, rate, showBs }: Props) {
  const total = fromCents(totals.totalCents);
  const bs = bsLabel(total, rate, showBs);
  return (
    <dl className="space-y-1.5">
      <div className="flex justify-between text-ink-2">
        <dt>Subtotal</dt>
        <dd className="tabular-nums">{formatUsd(fromCents(totals.subtotalCents))}</dd>
      </div>
      {totals.extrasCents > 0 && (
        <div className="flex justify-between text-ink-2">
          <dt>Extras</dt>
          <dd className="tabular-nums">{formatUsd(fromCents(totals.extrasCents))}</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between border-t border-line pt-2">
        <dt className="font-display text-lg font-bold">Total</dt>
        <dd className="text-right">
          <span className="block font-display text-2xl font-extrabold tabular-nums">{formatUsd(total)}</span>
          {bs && <span className="block text-sm text-ink-3 tabular-nums">{bs}</span>}
        </dd>
      </div>
    </dl>
  );
}
