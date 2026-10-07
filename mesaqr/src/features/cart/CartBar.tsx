import { ShoppingBag } from 'lucide-react';
import { formatUsd, fromCents } from '@/shared/lib/money';
import type { CartTotals } from './cartMath';

interface Props {
  totals: CartTotals;
  onOpen: () => void;
}

/** Carrito siempre accesible: barra fija inferior. */
export function CartBar({ totals, onOpen }: Props) {
  if (totals.count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={onOpen}
        className="mx-auto flex h-14 w-full max-w-xl items-center gap-3 rounded-full bg-brand pr-5 pl-2 text-brand-ink shadow-[0_8px_24px_-6px_rgb(26_23_20/0.45)]"
      >
        <span key={totals.count} className="bump grid size-10 place-items-center rounded-full bg-black/15 font-display font-extrabold tabular-nums">
          {totals.count}
        </span>
        <span className="flex items-center gap-2 font-display text-lg font-bold">
          <ShoppingBag size={20} aria-hidden /> Ver pedido
        </span>
        <span className="ml-auto font-display text-lg font-extrabold tabular-nums">{formatUsd(fromCents(totals.totalCents))}</span>
      </button>
    </div>
  );
}
