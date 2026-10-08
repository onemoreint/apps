import type { MenuProduct } from '@/shared/types/menu';
import { formatUsd } from '@/shared/lib/money';
import { ProductImage } from '@/shared/ui/ProductImage';

interface Props {
  products: MenuProduct[];
  onPick: (p: MenuProduct) => void;
}

/** Lista corta de productos que se agregan con un toque. */
export function SuggestionList({ products, onPick }: Props) {
  return (
    <ul className="divide-y divide-line">
      {products.map((p) => (
        <li key={p.id}>
          <button type="button" onClick={() => onPick(p)} className="flex w-full items-center gap-3 py-3 text-left" aria-label={`Agregar ${p.name}, ${formatUsd(p.price_usd)}`}>
            <ProductImage src={p.image_url} alt="" className="size-14 shrink-0 rounded-xl" />
            <span className="min-w-0 flex-1 leading-snug font-medium">{p.name}</span>
            <span className="shrink-0 rounded-full border-2 border-brand px-3 py-1 font-display text-sm font-bold text-brand tabular-nums">
              +{formatUsd(p.price_usd)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
