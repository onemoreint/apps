import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { clampQty, lineKey, MAX_LINES, MAX_NOTES, type CartLine, type CartOption } from './cartMath';

interface AddInput {
  productId: string;
  name: string;
  baseCents: number;
  options: CartOption[];
  quantity: number;
}

interface CartState {
  /** El carrito pertenece a una mesa: si cambia el token, se vacía. */
  token: string | null;
  lines: CartLine[];
  notes: string;
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

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      token: null,
      lines: [],
      notes: '',

      bindToken: (token) => {
        if (get().token !== token) set({ token, lines: [], notes: '' });
      },

      add: (input) => {
        const key = lineKey(input.productId, input.options.map((o) => o.id));
        const lines = get().lines;
        const existing = lines.find((l) => l.key === key);
        if (existing) {
          set({ lines: lines.map((l) => (l.key === key ? { ...l, quantity: clampQty(l.quantity + input.quantity) } : l)) });
          return true;
        }
        if (lines.length >= MAX_LINES) return false;
        set({ lines: [...lines, { key, ...input, quantity: clampQty(input.quantity) }] });
        return true;
      },

      replace: (oldKey, input) => {
        const key = lineKey(input.productId, input.options.map((o) => o.id));
        const next: CartLine = { key, ...input, quantity: clampQty(input.quantity) };
        const others = get().lines.filter((l) => l.key !== oldKey);
        const dup = others.find((l) => l.key === key);
        const idx = get().lines.findIndex((l) => l.key === oldKey);
        if (dup) {
          set({ lines: others.map((l) => (l.key === key ? { ...l, quantity: clampQty(l.quantity + next.quantity) } : l)) });
        } else {
          const copy = [...others];
          copy.splice(Math.max(0, idx), 0, next);
          set({ lines: copy });
        }
      },

      setQty: (key, qty) =>
        set({ lines: get().lines.map((l) => (l.key === key ? { ...l, quantity: clampQty(qty) } : l)) }),

      remove: (key) => set({ lines: get().lines.filter((l) => l.key !== key) }),

      setNotes: (notes) => set({ notes: notes.slice(0, MAX_NOTES) }),

      purge: (ids) => {
        const removed: string[] = [];
        const lines = get().lines.filter((l) => {
          const bad = ids.has(l.productId) || l.options.some((o) => ids.has(o.id));
          if (bad) removed.push(l.name);
          return !bad;
        });
        set({ lines });
        return removed;
      },

      clear: () => set({ lines: [], notes: '' }),
    }),
    {
      name: 'mesaqr-cart',
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ token: s.token, lines: s.lines, notes: s.notes }),
    },
  ),
);
