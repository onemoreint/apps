import { Flame, Home, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { formatUsd, fromCents } from '@/shared/lib/money';
import type { CartTotals } from '@/features/cart/cartMath';

export type View = 'inicio' | 'menu' | 'ofertas';

interface Props {
  view: View;
  showOffers: boolean;
  totals: CartTotals;
  onView: (v: View) => void;
  onCart: () => void;
}

/**
 * Navegación inferior. "Mi pedido" siempre visible: con productos se convierte
 * en el botón principal con cantidad y total.
 */
export function BottomNav({ view, showOffers, totals, onView, onCart }: Props) {
  const item = (v: View, label: string, Icon: typeof Home) => {
    const on = view === v;
    return (
      <button
        type="button"
        onClick={() => onView(v)}
        aria-current={on ? 'page' : undefined}
        className={`flex min-w-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-semibold ${on ? 'text-ink' : 'text-ink-3'}`}
      >
        <Icon size={22} strokeWidth={on ? 2.5 : 2} aria-hidden />
        {label}
      </button>
    );
  };
  const has = totals.count > 0;

  return (
    <nav
      aria-label="Navegación"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex h-16 max-w-xl items-stretch gap-1 px-2 py-1.5">
        {item('inicio', 'Inicio', Home)}
        {item('menu', 'Menú', UtensilsCrossed)}
        {showOffers && item('ofertas', 'Ofertas', Flame)}
        <button
          type="button"
          onClick={onCart}
          aria-label={has ? `Mi pedido: ${totals.count} productos, ${formatUsd(fromCents(totals.totalCents))}` : 'Mi pedido, vacío'}
          className={`flex items-center justify-center gap-2 rounded-full px-3 font-display font-bold transition-[flex-grow,background-color] duration-300 ${
            has ? 'flex-[2.2] bg-brand text-brand-ink shadow-[0_6px_18px_-6px_rgb(26_23_20/0.45)]' : 'flex-1 flex-col gap-0.5 font-sans text-xs font-semibold text-ink-3'
          }`}
        >
          <span className="relative flex">
            <ShoppingBag size={22} aria-hidden />
            {has && (
              <span
                key={totals.count}
                className="bump absolute -top-2 -right-2.5 grid min-w-5 place-items-center rounded-full bg-paper px-1 text-[0.6875rem] leading-5 font-extrabold text-brand tabular-nums"
              >
                {totals.count}
              </span>
            )}
          </span>
          {has ? (
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[0.8125rem] opacity-90">Mi pedido</span>
              <span className="tabular-nums">{formatUsd(fromCents(totals.totalCents))}</span>
            </span>
          ) : (
            'Pedido'
          )}
        </button>
      </div>
    </nav>
  );
}
