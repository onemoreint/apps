import { createOrder, type OrderLineInput } from '@/shared/lib/rpc';
import { buildOrderMessage, waLink } from '@/shared/lib/whatsapp';
import { toCents } from '@/shared/lib/money';
import type { CartLine } from '@/features/cart/cartMath';
import type { SentOrder } from '@/features/menu/tableSession';

export function toOrderLines(lines: CartLine[]): OrderLineInput[] {
  return lines.map((l) => ({ product_id: l.productId, quantity: l.quantity, option_ids: l.options.map((o) => o.id) }));
}

/**
 * 1) Registra el pedido en el servidor (precios recalculados allí).
 * 2) Construye el mensaje con la respuesta del servidor.
 * 3) Devuelve el enlace de WhatsApp listo para abrir.
 */
export async function sendOrder(params: {
  token: string;
  lines: CartLine[];
  notes: string;
  expectedTotalCents: number;
  whatsapp: string;
  tableLabel: string | null;
}): Promise<SentOrder> {
  const order = await createOrder(params.token, toOrderLines(params.lines), params.notes.trim());
  const text = buildOrderMessage(order, params.tableLabel);
  return {
    code: order.code,
    link: waLink(params.whatsapp, text),
    totalUsd: Number(order.total_usd),
    totalBs: order.show_bs ? Number(order.total_bs) : null,
    priceChanged: toCents(order.total_usd) !== params.expectedTotalCents,
    at: Date.now(),
  };
}
