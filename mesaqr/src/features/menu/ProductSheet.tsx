import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import type { MenuOptionGroup, MenuProduct } from '@/shared/types/menu';
import { formatDelta, formatUsd, toCents, fromCents } from '@/shared/lib/money';
import { Sheet } from '@/shared/ui/Sheet';
import { ProductImage } from '@/shared/ui/ProductImage';
import { QtyStepper } from '@/shared/ui/QtyStepper';
import { Price } from '@/shared/ui/Price';
import type { CartLine, CartOption } from '@/features/cart/cartMath';
import { EXPERIENCE } from '@/shared/config/experience';
import { BadgeChip } from './BadgeChip';
import { savingsCents } from './catalog';
import { groupRule, groupsFor, type MenuIndex } from './menuIndex';

export interface ProductChoice {
  productId: string;
  name: string;
  baseCents: number;
  options: CartOption[];
  quantity: number;
  note: string;
}

interface Props {
  idx: MenuIndex;
  product: MenuProduct;
  /** Si viene, se está editando esa línea del carrito. */
  editing?: CartLine;
  /** Observación inicial (por ejemplo, la del producto que se convirtió en combo). */
  initialNote?: string;
  onClose: () => void;
  onConfirm: (choice: ProductChoice) => void;
}

function initialSelection(groups: MenuOptionGroup[], editing?: CartLine): Record<string, string[]> {
  const sel: Record<string, string[]> = {};
  const chosen = new Set(editing?.options.map((o) => o.id));
  for (const g of groups) {
    if (editing) {
      sel[g.id] = g.options.filter((o) => chosen.has(o.id)).map((o) => o.id);
    } else {
      // Grupo obligatorio de selección única: se preselecciona la primera opción
      sel[g.id] = g.selection === 'single' && g.min_select > 0 && g.options[0] ? [g.options[0].id] : [];
    }
  }
  return sel;
}

export function ProductSheet({ idx, product, editing, initialNote, onClose, onConfirm }: Props) {
  const { business } = idx.menu;
  const groups = useMemo(() => groupsFor(idx, product), [idx, product]);
  const [sel, setSel] = useState(() => initialSelection(groups, editing));
  const [qty, setQty] = useState(editing?.quantity ?? 1);
  const [note, setNote] = useState(editing?.note ?? initialNote ?? '');
  const saving = savingsCents(product);

  const toggle = (g: MenuOptionGroup, optionId: string) => {
    setSel((prev) => {
      const cur = prev[g.id] ?? [];
      if (g.selection === 'single') {
        const isOn = cur.includes(optionId);
        return { ...prev, [g.id]: isOn && g.min_select === 0 ? [] : [optionId] };
      }
      if (cur.includes(optionId)) return { ...prev, [g.id]: cur.filter((x) => x !== optionId) };
      if (cur.length >= g.max_select) return prev;
      return { ...prev, [g.id]: [...cur, optionId] };
    });
  };

  const chosen: CartOption[] = groups.flatMap((g) =>
    g.options
      .filter((o) => (sel[g.id] ?? []).includes(o.id))
      .map((o) => ({ id: o.id, name: o.name, groupName: g.name, deltaCents: toCents(o.price_delta_usd) })),
  );
  const missing = groups.find((g) => (sel[g.id]?.length ?? 0) < g.min_select);
  const unitCents = toCents(product.price_usd) + chosen.reduce((s, o) => s + o.deltaCents, 0);
  const totalUsd = fromCents(unitCents * qty);

  const confirm = () => {
    if (missing) return;
    onConfirm({ productId: product.id, name: product.name, baseCents: toCents(product.price_usd), options: chosen, quantity: qty, note: note.trim() });
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={product.name}
      hideTitle
      footer={
        <div className="flex items-center gap-3">
          <QtyStepper value={qty} onChange={setQty} label={product.name} size="lg" />
          <button
            type="button"
            onClick={confirm}
            disabled={!!missing}
            className="flex h-12 flex-1 items-center justify-between gap-2 rounded-full bg-brand px-5 font-display font-bold text-brand-ink disabled:opacity-45"
          >
            <span>{missing ? `Elige ${missing.name.toLowerCase()}` : editing ? 'Guardar cambios' : 'Agregar'}</span>
            <span key={unitCents * qty} className="bump tabular-nums" aria-live="polite">
              {formatUsd(totalUsd)}
            </span>
          </button>
        </div>
      }
    >
      <ProductImage src={product.image_url} alt={product.name} eager className="-mx-5 mb-4 aspect-[16/10] w-[calc(100%+2.5rem)] max-w-none" />
      {product.badges.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {product.badges.map((b) => (
            <BadgeChip key={b} badge={b} />
          ))}
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-display text-2xl leading-tight font-extrabold" aria-hidden>
          {product.name}
        </h2>
        <Price usd={product.price_usd} rate={business.exchange_rate} showBs={business.show_bs} className="items-end pt-1" />
      </div>
      {saving !== null && product.compare_at_price_usd !== null && (
        <p className="mt-1 text-sm text-ink-2">
          Antes <s className="tabular-nums">{formatUsd(product.compare_at_price_usd)}</s> · Ahorras{' '}
          <strong className="text-send tabular-nums">{formatUsd(saving / 100)}</strong>
        </p>
      )}
      {product.description && <p className="mt-2 text-ink-2">{product.description}</p>}

      {product.type === 'combo' && product.combo_items.length > 0 && (
        <div className="mt-4 rounded-2xl bg-shelf p-4">
          <h3 className="font-display font-bold">Incluye</h3>
          <ul className="mt-2 space-y-1.5">
            {product.combo_items.map((c, i) => (
              <li key={i} className="flex items-center gap-2 text-ink-2">
                <Check size={16} className="text-send" aria-hidden />
                {c.quantity > 1 ? `${c.quantity} × ` : ''}
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {groups.map((g) => {
        const picked = sel[g.id] ?? [];
        const full = g.selection === 'multiple' && picked.length >= g.max_select;
        return (
          <fieldset key={g.id} className="mt-6">
            <legend className="flex w-full items-baseline justify-between gap-3">
              <span className="font-display text-lg font-bold">{g.name}</span>
              <span className={`text-sm ${g.min_select > 0 && picked.length < g.min_select ? 'font-semibold text-brand' : 'text-ink-3'}`}>
                {groupRule(g)}
              </span>
            </legend>
            <div className="mt-2 divide-y divide-line">
              {g.options.map((o) => {
                const on = picked.includes(o.id);
                const disabled = !on && full;
                return (
                  <label
                    key={o.id}
                    className={`flex min-h-12 cursor-pointer items-center gap-3 py-2 ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
                  >
                    <input
                      type={g.selection === 'single' ? 'radio' : 'checkbox'}
                      name={g.id}
                      checked={on}
                      disabled={disabled}
                      onChange={() => toggle(g, o.id)}
                      onClick={(e) => {
                        // Permite desmarcar un radio opcional
                        if (g.selection === 'single' && on && g.min_select === 0) {
                          e.preventDefault();
                          toggle(g, o.id);
                        }
                      }}
                      className="size-5 accent-[var(--brand)]"
                    />
                    <span className="flex-1">{o.name}</span>
                    <span className="text-sm text-ink-2 tabular-nums">{formatDelta(o.price_delta_usd)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <div className="mt-6">
        <label htmlFor="item-note" className="font-display text-lg font-bold">
          Observaciones <span className="text-sm font-normal text-ink-3">(opcional)</span>
        </label>
        <textarea
          id="item-note"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, EXPERIENCE.itemNoteMax))}
          maxLength={EXPERIENCE.itemNoteMax}
          rows={2}
          placeholder="Ej.: sin cebolla, poca salsa…"
          className="mt-2 w-full resize-none rounded-2xl border border-line bg-shelf px-4 py-3 text-base outline-none focus:border-ink"
        />
        {note.length > EXPERIENCE.itemNoteMax - 30 && (
          <p className="text-right text-xs text-ink-3 tabular-nums">
            {note.length}/{EXPERIENCE.itemNoteMax}
          </p>
        )}
      </div>
    </Sheet>
  );
}
