import type { MenuProduct } from '@/shared/types/menu';
import type { MenuIndex } from './menuIndex';
import { ProductRow } from './ProductRow';

interface Props {
  idx: MenuIndex;
  products: MenuProduct[];
  qtyInCart: Map<string, number>;
  onOpen: (p: MenuProduct) => void;
  onQuickAdd: (p: MenuProduct) => void;
}

/** 🔥 Ofertas: productos marcados como oferta o con precio anterior mayor. */
export function OffersView({ idx, products, qtyInCart, onOpen, onQuickAdd }: Props) {
  const { business } = idx.menu;
  return (
    <section className="px-4 pt-6" aria-labelledby="offers-title">
      <h1 id="offers-title" className="font-display text-[1.875rem] leading-tight font-extrabold tracking-tight">
        🔥 Ofertas
      </h1>
      <div className="divide-y divide-line">
        {products.map((p) => (
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
    </section>
  );
}
