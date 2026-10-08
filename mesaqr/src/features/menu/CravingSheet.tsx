import { useMemo, useState } from 'react';
import type { MenuProduct } from '@/shared/types/menu';
import { CRAVINGS, type CravingKey } from '@/shared/config/experience';
import { Sheet } from '@/shared/ui/Sheet';
import { cravingMatches } from './catalog';
import type { MenuIndex } from './menuIndex';
import { ProductRow } from './ProductRow';

interface Props {
  idx: MenuIndex;
  qtyInCart: Map<string, number>;
  onOpen: (p: MenuProduct) => void;
  onQuickAdd: (p: MenuProduct) => void;
  onClose: () => void;
}

/**
 * "¿No sabes qué pedir?": filtra el catálogo por antojos (etiquetas que pone el
 * restaurante) y por precio. Solo aparecen los antojos que tienen productos.
 */
export function CravingSheet({ idx, qtyInCart, onOpen, onQuickAdd, onClose }: Props) {
  const options = useMemo(
    () => CRAVINGS.map((c) => ({ ...c, products: cravingMatches(idx, c.key) })).filter((c) => c.products.length > 0),
    [idx],
  );
  const [pick, setPick] = useState<CravingKey | null>(null);
  const current = options.find((o) => o.key === pick);
  const { business } = idx.menu;

  return (
    <Sheet open onClose={onClose} title="🤔 ¿No sabes qué pedir?">
      <p className="font-display text-lg font-bold">¿Qué se te antoja?</p>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Antojos">
        {options.map((o) => {
          const on = o.key === pick;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPick(on ? null : o.key)}
              className={`min-h-11 rounded-full border-2 px-4 font-semibold transition-colors ${on ? 'border-ink bg-ink text-white' : 'border-line bg-paper'}`}
            >
              <span aria-hidden className="mr-1">
                {o.emoji}
              </span>
              {o.label}
            </button>
          );
        })}
      </div>

      {current ? (
        <div className="mt-4 divide-y divide-line" aria-live="polite">
          {current.products.map((p) => (
            <ProductRow
              key={p.id}
              product={p}
              rate={business.exchange_rate}
              showBs={business.show_bs}
              inCart={qtyInCart.get(p.id) ?? 0}
              onOpen={onOpen}
              onQuickAdd={onQuickAdd}
            />
          ))}
        </div>
      ) : (
        <p className="mt-6 pb-4 text-center text-ink-3">Elige un antojo y te mostramos opciones del menú.</p>
      )}
    </Sheet>
  );
}
