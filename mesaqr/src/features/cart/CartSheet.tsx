import { ShoppingBag } from 'lucide-react';
import { formatUsd, fromCents } from '@/shared/lib/money';
import { Sheet } from '@/shared/ui/Sheet';
import { QtyStepper } from '@/shared/ui/QtyStepper';
import { useCart } from './cartStore';
import { cartTotals, lineTotalCents, MAX_NOTES, type CartLine } from './cartMath';
import { CartSummary } from './CartSummary';
import type { MenuProduct } from '@/shared/types/menu';
import { SuggestionList } from '@/features/menu/SuggestionList';

interface Props {
  rate: number;
  showBs: boolean;
  canEdit: (line: CartLine) => boolean;
  onEdit: (line: CartLine) => void;
  onReview: () => void;
  onClose: () => void;
  /** "¿Quieres agregar algo más?": máximo 3, se agregan con un toque. */
  suggested: MenuProduct[];
  onSuggest: (p: MenuProduct) => void;
}

export function CartSheet({ rate, showBs, canEdit, onEdit, onReview, onClose, suggested, onSuggest }: Props) {
  const { lines, notes, setQty, remove, setNotes } = useCart();
  const totals = cartTotals(lines);
  const empty = lines.length === 0;

  return (
    <Sheet
      open
      onClose={onClose}
      title="Tu pedido"
      footer={
        empty ? (
          <button type="button" onClick={onClose} className="h-12 w-full rounded-full bg-brand font-display font-bold text-brand-ink">
            Ver el menú
          </button>
        ) : (
          <button type="button" onClick={onReview} className="h-13 w-full rounded-full bg-brand font-display text-lg font-bold text-brand-ink">
            Revisar pedido
          </button>
        )
      }
    >
      {empty ? (
        <div className="py-10 text-center">
          <ShoppingBag size={40} className="mx-auto text-ink-3" aria-hidden />
          <p className="mt-3 font-display text-xl font-bold">Tu carrito está vacío</p>
          <p className="mt-1 text-ink-2">Explora el menú y agrega algo delicioso.</p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {lines.map((l) => (
              <li key={l.key} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display font-bold">{l.name}</p>
                    {l.options.length > 0 && (
                      <ul className="mt-0.5 text-sm text-ink-2">
                        {l.options.map((o) => (
                          <li key={o.id}>
                            {o.deltaCents > 0 ? '+ ' : ''}
                            {o.name}
                          </li>
                        ))}
                      </ul>
                    )}
                    {l.note && <p className="mt-0.5 text-sm text-ink-2 italic">✏️ {l.note}</p>}
                    {canEdit(l) && (
                      <button type="button" onClick={() => onEdit(l)} className="mt-1 text-sm font-semibold text-brand underline underline-offset-2">
                        Editar
                      </button>
                    )}
                  </div>
                  <span className="font-display font-bold tabular-nums">{formatUsd(fromCents(lineTotalCents(l)))}</span>
                </div>
                <div className="mt-2">
                  <QtyStepper value={l.quantity} onChange={(n) => setQty(l.key, n)} onRemove={() => remove(l.key)} label={l.name} />
                </div>
              </li>
            ))}
          </ul>

          {suggested.length > 0 && (
            <section className="mt-2 rounded-2xl bg-shelf px-4 pt-3 pb-1" aria-labelledby="more-title">
              <h3 id="more-title" className="font-display font-bold">
                🔥 ¿Quieres agregar algo más?
              </h3>
              <SuggestionList products={suggested} onPick={onSuggest} />
            </section>
          )}

          <div className="mt-4">
            <label htmlFor="notes" className="font-display font-bold">
              Observaciones del pedido
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={MAX_NOTES}
              rows={2}
              placeholder="Ej.: la bebida sin hielo"
              className="mt-1.5 w-full resize-none rounded-2xl border border-line bg-shelf px-4 py-3 text-base outline-none focus:border-ink"
            />
            <p className="text-right text-xs text-ink-3 tabular-nums">
              {notes.length}/{MAX_NOTES}
            </p>
          </div>

          <div className="mt-3">
            <CartSummary totals={totals} rate={rate} showBs={showBs} />
          </div>
        </>
      )}
    </Sheet>
  );
}
