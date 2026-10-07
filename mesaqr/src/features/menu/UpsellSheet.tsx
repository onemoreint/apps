import type { MenuProduct } from '@/shared/types/menu';
import { formatUsd } from '@/shared/lib/money';
import { Sheet } from '@/shared/ui/Sheet';
import { ProductImage } from '@/shared/ui/ProductImage';

interface Props {
  products: MenuProduct[];
  onPick: (p: MenuProduct) => void;
  onClose: () => void;
}

/** Sugerencia discreta tras el primer producto agregado. Aparece una sola vez. */
export function UpsellSheet({ products, onPick, onClose }: Props) {
  return (
    <Sheet
      open
      onClose={onClose}
      title="¿Quieres completar tu pedido?"
      footer={
        <button type="button" onClick={onClose} className="h-12 w-full rounded-full bg-shelf font-display font-bold">
          No, gracias
        </button>
      }
    >
      <ul className="divide-y divide-line">
        {products.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onPick(p)} className="flex w-full items-center gap-3 py-3 text-left">
              <ProductImage src={p.image_url} alt="" className="size-14 rounded-xl" />
              <span className="flex-1 font-medium">{p.name}</span>
              <span className="rounded-full border-2 border-brand px-3 py-1 font-display text-sm font-bold text-brand tabular-nums">
                +{formatUsd(p.price_usd)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
