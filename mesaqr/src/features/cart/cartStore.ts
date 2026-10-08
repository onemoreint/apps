import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { EXPERIENCE } from '@/shared/config/experience';
import { clampQty, lineKey, MAX_LINES, MAX_NOTES, type CartLine, type CartOption } from './cartMath';

export interface AddInput {
  productId: string;
  name: string;
  baseCents: number;
  options: CartOption[];
  quantity: number;
  note?: string;
}

interface CartState {
  /** Negocio al que pertenece el carrito: si cambia, se vacía. */
  token: string | null;
  lines: CartLine[];
  notes: string;
  /** Última modificación (para descartar carritos viejos al volver). */
  updatedAt: number;
  bindToken: (token: string) => void;
  add: (input: AddInput) => boolean;
  replace: (oldKey: string, input: AddInput) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  setNotes: (notes: string) => void;
  /** Quita líneas cuyo producto u opción ya no está disponible. Devuelve nombres quitados. */
  purge: (unavailableIds: Set<string>) => string[];
  clear: () => void;
}

function toLine(input: AddInput): CartLine {
  const note = (input.note ?? '').trim().slice(0, EXPERIENCE.itemNoteMax);
  return {
    key: lineKey(input.productId, input.options.map((o) => o.id), note),
    productId: input.productId,
    name: input.name,
    baseCents: input.baseCents,
    options: input.options,
    quantity: clampQty(input.quantity),
    note,
  };
}

const now = () => Date.now();

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      token: null,
      lines: [],
      notes: '',
      updatedAt: 0,

      bindToken: (token) => {
        if (get().token !== token) set({ token, lines: [], notes: '', updatedAt: now() });
      },

      add: (input) => {
        const next = toLine(input);
        const lines = get().lines;
        if (lines.some((l) => l.key === next.key)) {
          set({
            lines: lines.map((l) => (l.key === next.key ? { ...l, quantity: clampQty(l.quantity + next.quantity) } : l)),
            updatedAt: now(),
          });
          return true;
        }
        if (lines.length >= MAX_LINES) return false;
        set({ lines: [...lines, next], updatedAt: now() });
        return true;
      },

      replace: (oldKey, input) => {
        const next = toLine(input);
        const others = get().lines.filter((l) => l.key !== oldKey);
        const idx = get().lines.findIndex((l) => l.key === oldKey);
        if (others.some((l) => l.key === next.key)) {
          set({
            lines: others.map((l) => (l.key === next.key ? { ...l, quantity: clampQty(l.quantity + next.quantity) } : l)),
            updatedAt: now(),
          });
        } else {
          const copy = [...others];
          copy.splice(Math.max(0, idx), 0, next);
          set({ lines: copy, updatedAt: now() });
        }
      },

      setQty: (key, qty) =>
        set({ lines: get().lines.map((l) => (l.key === key ? { ...l, quantity: clampQty(qty) } : l)), updatedAt: now() }),

      remove: (key) => set({ lines: get().lines.filter((l) => l.key !== key), updatedAt: now() }),

      setNotes: (notes) => set({ notes: notes.slice(0, MAX_NOTES), updatedAt: now() }),

      purge: (ids) => {
        const removed: string[] = [];
        const lines = get().lines.filter((l) => {
          const bad = ids.has(l.productId) || l.options.some((o) => ids.has(o.id));
          if (bad) removed.push(l.name);
          return !bad;
        });
        set({ lines, updatedAt: now() });
        return removed;
      },

      clear: () => set({ lines: [], notes: '', updatedAt: now() }),
    }),
    {
      name: 'mesaqr-cart',
      version: 2,
      // localStorage: el pedido sobrevive si el cliente cierra la pestaña o va a WhatsApp y vuelve.
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ token: s.token, lines: s.lines, notes: s.notes, updatedAt: s.updatedAt }),
      // Versión 1 (sin observación por producto) → se completa con nota vacía.
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<CartState>;
        if (version < 2) p.lines = (p.lines ?? []).map((l) => ({ ...l, note: l.note ?? '' }));
        return p as CartState;
      },
      // Un carrito olvidado hace horas no se recupera.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CartState>;
        const fresh = typeof p.updatedAt === 'number' && now() - p.updatedAt < EXPERIENCE.cartTtlMs;
        if (!fresh || !Array.isArray(p.lines)) return current;
        return { ...current, token: p.token ?? null, lines: p.lines, notes: typeof p.notes === 'string' ? p.notes : '', updatedAt: p.updatedAt! };
      },
    },
  ),
);
