import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { MenuProduct } from '@/shared/types/menu';
import { bsLabel, formatUsd } from '@/shared/lib/money';
import { ProductImage } from '@/shared/ui/ProductImage';
import { BadgeChip } from './BadgeChip';
import { savingsCents, topBadge } from './catalog';

interface Props {
  product: MenuProduct;
  rate: number;
  showBs: boolean;
  inCart: number;
  eager?: boolean;
  onOpen: (p: MenuProduct) => void;
  /** Agregar sin entrar al detalle (si el producto exige elegir algo, abre el detalle). */
  onQuickAdd: (p: MenuProduct) => void;
}

/**
 * Tarjeta de producto: tocar la tarjeta abre el detalle; el botón "Agregar"
 * agrega directo, sin obligar a entrar a otra pantalla.
 */
export function ProductRow({ product, rate, showBs, inCart, eager, onOpen, onQuickAdd }: Props) {
  const [popKey, setPopKey] = useState(0);
  const soldOut = !product.available;
  const bs = bsLabel(product.price_usd, rate, showBs);
  const badge = topBadge(product);
  const saving = savingsCents(product);
  const includes =
    product.type === 'combo' && product.combo_items.length > 0
      ? `Incluye: ${product.combo_items.map((c) => (c.quantity > 1 ? `${c.quantity} ${c.label}` : c.label)).join(', ')}`
      : null;

  return (
    <article className="flex gap-4 py-4" aria-label={soldOut ? `${product.name}, agotado` : undefined}>
      <button
        type="button"
        onClick={() => onOpen(product)}
        disabled={soldOut}
        className="min-w-0 flex-1 py-1 text-left disabled:cursor-default"
        aria-label={soldOut ? undefined : `Ver ${product.name}, ${formatUsd(product.price_usd)}`}
      >
        {badge && !soldOut && <BadgeChip badge={badge} className="mb-1.5" />}
        <h3 className="font-display text-[1.0625rem] leading-snug font-bold">
          {product.name}
          {inCart > 0 && (
            <span className="ml-2 inline-grid min-w-6 place-items-center rounded-full bg-brand px-1.5 align-[2px] text-xs font-bold text-brand-ink">
              {inCart}
              <span className="sr-only"> en tu pedido</span>
            </span>
          )}
        </h3>
        {(includes || product.description) && <p className="mt-1 line-clamp-2 text-sm text-ink-2">{includes ?? product.description}</p>}
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className={`font-display text-lg font-bold tabular-nums ${soldOut ? 'text-ink-3' : ''}`}>{formatUsd(product.price_usd)}</span>
          {saving !== null && product.compare_at_price_usd !== null && (
            <s className="text-sm text-ink-3 tabular-nums">
              <span className="sr-only">Antes </span>
              {formatUsd(product.compare_at_price_usd)}
            </s>
          )}
          {bs && <span className="text-xs text-ink-3 tabular-nums">{bs}</span>}
        </div>
      </button>

      <div className="relative shrink-0 self-start">
        {/* La foto también abre el detalle; el botón de texto ya lo anuncia a lectores de pantalla */}
        <button type="button" tabIndex={-1} aria-hidden onClick={() => !soldOut && onOpen(product)} className="block">
          <ProductImage
            src={product.image_url}
            alt=""
            eager={eager}
            className={`size-28 rounded-2xl ${soldOut ? 'opacity-50 grayscale' : ''}`}
          />
        </button>
        {soldOut ? (
          <span className="absolute inset-x-2 bottom-2 rounded-md bg-ink py-0.5 text-center text-xs font-bold text-white">Agotado</span>
        ) : (
          <button
            key={popKey}
            type="button"
            onClick={() => {
              setPopKey((k) => k + 1);
              onQuickAdd(product);
            }}
            aria-label={`Agregar ${product.name}`}
            className={`absolute -bottom-3 left-1/2 flex h-9 -translate-x-1/2 items-center gap-1 rounded-full border-[3px] border-paper bg-brand pr-3.5 pl-2.5 font-display text-sm font-bold whitespace-nowrap text-brand-ink shadow-sm ${popKey ? 'pop' : ''}`}
          >
            <Plus size={16} strokeWidth={3} aria-hidden /> Agregar
          </button>
        )}
      </div>
    </article>
  );
}
