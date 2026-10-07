import { Plus } from 'lucide-react';
import type { MenuProduct } from '@/shared/types/menu';
import { bsLabel, formatUsd } from '@/shared/lib/money';
import { ProductImage } from '@/shared/ui/ProductImage';

interface Props {
  product: MenuProduct;
  rate: number;
  showBs: boolean;
  inCart: number;
  eager?: boolean;
  onOpen: (p: MenuProduct) => void;
}

export function ProductRow({ product, rate, showBs, inCart, eager, onOpen }: Props) {
  const soldOut = !product.available;
  const bs = bsLabel(product.price_usd, rate, showBs);
  const includes =
    product.type === 'combo' && product.combo_items.length > 0
      ? `Incluye: ${product.combo_items.map((c) => (c.quantity > 1 ? `${c.quantity} ${c.label}` : c.label)).join(', ')}`
      : null;

  const body = (
    <>
      <div className="min-w-0 flex-1 py-1">
        <h3 className="font-display text-[1.0625rem] leading-snug font-bold">
          {product.name}
          {inCart > 0 && (
            <span className="ml-2 inline-grid min-w-6 place-items-center rounded-full bg-brand px-1.5 align-[2px] text-xs font-bold text-brand-ink">
              {inCart}
              <span className="sr-only"> en tu pedido</span>
            </span>
          )}
        </h3>
        {(includes || product.description) && (
          <p className="mt-1 line-clamp-2 text-sm text-ink-2">{includes ?? product.description}</p>
        )}
        <div className="mt-2 flex items-baseline gap-2">
          <span className={`font-display text-lg font-bold tabular-nums ${soldOut ? 'text-ink-3' : ''}`}>{formatUsd(product.price_usd)}</span>
          {bs && <span className="text-xs text-ink-3 tabular-nums">{bs}</span>}
        </div>
      </div>
      <div className="relative shrink-0">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          eager={eager}
          className={`size-28 rounded-2xl ${soldOut ? 'opacity-50 grayscale' : ''}`}
        />
        {soldOut ? (
          <span className="absolute inset-x-2 bottom-2 rounded-md bg-ink py-0.5 text-center text-xs font-bold text-white">Agotado</span>
        ) : (
          <span
            className="absolute -right-1.5 -bottom-1.5 grid size-10 place-items-center rounded-full border-4 border-paper bg-brand text-brand-ink"
            aria-hidden
          >
            <Plus size={20} strokeWidth={3} />
          </span>
        )}
      </div>
    </>
  );

  if (soldOut) {
    return (
      <div className="flex gap-4 py-4" aria-label={`${product.name}, agotado`}>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(product)}
      className="flex w-full gap-4 py-4 text-left"
      aria-label={`${product.name}, ${formatUsd(product.price_usd)}. Agregar`}
    >
      {body}
    </button>
  );
}
