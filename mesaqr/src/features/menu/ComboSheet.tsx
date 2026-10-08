import { Check } from 'lucide-react';
import type { MenuProduct } from '@/shared/types/menu';
import { formatUsd } from '@/shared/lib/money';
import { Sheet } from '@/shared/ui/Sheet';
import { ProductImage } from '@/shared/ui/ProductImage';
import { Price } from '@/shared/ui/Price';
import { savingsCents } from './catalog';

interface Props {
  base: MenuProduct;
  combo: MenuProduct;
  rate: number;
  showBs: boolean;
  onAccept: () => void;
  onClose: () => void;
}

/**
 * "¿Quieres convertirlo en combo?" — solo aparece si el restaurante configuró
 * un combo para ese producto. El ahorro se muestra solo si hay precio anterior real.
 */
export function ComboSheet({ base, combo, rate, showBs, onAccept, onClose }: Props) {
  const saving = savingsCents(combo);
  return (
    <Sheet
      open
      onClose={onClose}
      title="¿Quieres convertirlo en combo?"
      footer={
        <div className="flex flex-col gap-2">
          <button type="button" onClick={onAccept} className="h-13 w-full rounded-full bg-brand font-display text-lg font-bold text-brand-ink">
            🔥 Agregar combo · {formatUsd(combo.price_usd)}
          </button>
          <button type="button" onClick={onClose} className="h-11 w-full rounded-full font-display font-bold text-ink-2">
            No, gracias
          </button>
        </div>
      }
    >
      <p className="text-ink-2">
        Cambia tu <strong className="text-ink">{base.name}</strong> por:
      </p>
      <div className="mt-3 flex gap-4 rounded-2xl bg-shelf p-3">
        <ProductImage src={combo.image_url} alt="" className="size-20 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight font-bold">{combo.name}</p>
          {combo.combo_items.length > 0 ? (
            <ul className="mt-1 space-y-0.5 text-sm text-ink-2">
              {combo.combo_items.map((c, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <Check size={14} className="text-send" aria-hidden />
                  {c.quantity > 1 ? `${c.quantity} × ` : ''}
                  {c.label}
                </li>
              ))}
            </ul>
          ) : (
            combo.description && <p className="mt-1 line-clamp-2 text-sm text-ink-2">{combo.description}</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="text-sm text-ink-2">
          {saving !== null && combo.compare_at_price_usd !== null && (
            <>
              <p>
                Por separado: <s className="tabular-nums">{formatUsd(combo.compare_at_price_usd)}</s>
              </p>
              <p className="font-semibold text-send">Ahorras {formatUsd(saving / 100)}</p>
            </>
          )}
        </div>
        <Price usd={combo.price_usd} rate={rate} showBs={showBs} strong className="items-end" />
      </div>
    </Sheet>
  );
}
