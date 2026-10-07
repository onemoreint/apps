/**
 * API de demostración (sin Supabase). Usa el menú incluido en la app y aplica
 * las mismas reglas que create_order en el servidor: productos disponibles,
 * opciones válidas para el producto, mínimos/máximos por grupo y totales en centavos.
 * Los pedidos NO se guardan en una base de datos: solo se arma el mensaje de WhatsApp.
 */
import type { CreatedOrder, Menu, MenuOptionGroup } from '@/shared/types/menu';
import { BASE } from './asset';
import { ApiError } from './errors';
import type { OrderLineInput } from './rpc';

export interface DemoData {
  menu: Omit<Menu, 'table'>;
  tables: { token: string; number: number; label: string | null }[];
}

let cache: Promise<DemoData> | null = null;

export function loadDemoData(): Promise<DemoData> {
  cache ??= fetch(`${BASE}demo-data/menu.json`).then((r) => {
    if (!r.ok) throw new ApiError('NETWORK');
    return r.json() as Promise<DemoData>;
  });
  cache.catch(() => (cache = null));
  return cache;
}

export async function demoFetchMenu(token: string): Promise<Menu> {
  const data = await loadDemoData();
  const table = data.tables.find((t) => t.token === token);
  if (!table) throw new ApiError('TABLE_NOT_FOUND');
  return { ...data.menu, table: { number: table.number, label: table.label } };
}

const COUNTER_KEY = 'mesaqr-demo-counter';
function nextNumber(): number {
  try {
    const n = Number(localStorage.getItem(COUNTER_KEY) ?? '0') + 1;
    localStorage.setItem(COUNTER_KEY, String(n));
    return n;
  } catch {
    return Math.floor(Math.random() * 9000) + 1;
  }
}

const cents = (usd: number) => Math.round(Number(usd) * 100);

export async function demoCreateOrder(token: string, items: OrderLineInput[], notes: string): Promise<CreatedOrder> {
  const menu = await demoFetchMenu(token);
  if (items.length < 1 || items.length > 30) throw new ApiError('INVALID_CART');
  const trimmed = notes.trim();
  if (trimmed.length > 280) throw new ApiError('INVALID_CART');

  const products = new Map(menu.products.map((p) => [p.id, p]));
  const groups = new Map(menu.option_groups.map((g) => [g.id, g]));
  const unavailable: string[] = [];
  let subtotal = 0;
  let extras = 0;
  const lines: CreatedOrder['items'] = [];

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) throw new ApiError('INVALID_CART');
    const p = products.get(item.product_id);
    if (!p || !p.available) {
      unavailable.push(item.product_id);
      continue;
    }
    const applicable = p.group_ids.map((id) => groups.get(id)).filter((g): g is MenuOptionGroup => !!g);
    const chosen = item.option_ids.map((oid) => {
      for (const g of applicable) {
        const o = g.options.find((x) => x.id === oid);
        if (o) return { g, o };
      }
      return null;
    });
    if (chosen.some((c) => c === null) || new Set(item.option_ids).size !== item.option_ids.length) {
      // Opción inexistente para este producto (o agotada: ya no aparece en el menú)
      throw new ApiError('INVALID_CART');
    }
    for (const g of applicable) {
      const n = chosen.filter((c) => c!.g.id === g.id).length;
      if (n < g.min_select || n > g.max_select) throw new ApiError('INVALID_CART');
    }
    const optCents = chosen.reduce((s, c) => s + cents(c!.o.price_delta_usd), 0);
    const base = cents(p.price_usd);
    subtotal += base * item.quantity;
    extras += optCents * item.quantity;
    lines.push({
      product_name: p.name,
      quantity: item.quantity,
      unit_price_usd: (base + optCents) / 100,
      line_total_usd: ((base + optCents) * item.quantity) / 100,
      options: chosen.map((c) => ({ group_name: c!.g.name, option_name: c!.o.name, price_delta_usd: Number(c!.o.price_delta_usd) })),
    });
  }
  if (unavailable.length) throw new ApiError('ITEMS_UNAVAILABLE', unavailable.join(','));

  const number = nextNumber();
  const totalUsd = (subtotal + extras) / 100;
  const rate = Number(menu.business.exchange_rate);
  return {
    code: `M${menu.table.number}-${String(number).padStart(4, '0')}`,
    order_number: number,
    created_at: new Date().toISOString(),
    table_number: menu.table.number,
    subtotal_usd: subtotal / 100,
    extras_usd: extras / 100,
    total_usd: totalUsd,
    exchange_rate: rate,
    show_bs: menu.business.show_bs,
    total_bs: Math.round(totalUsd * rate * 100) / 100,
    notes: trimmed || null,
    items: lines,
  };
}
