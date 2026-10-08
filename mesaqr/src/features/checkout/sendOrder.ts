import { createOrder, type OrderLineInput } from '@/shared/lib/rpc';
import { buildOrderMessage, waLink } from '@/shared/lib/whatsapp';
import { toCents } from '@/shared/lib/money';
import type { CustomerInfo } from '@/shared/types/menu';
import type { CartLine } from '@/features/cart/cartMath';
import type { SentOrder } from '@/features/menu/session';

export function toOrderLines(lines: CartLine[]): OrderLineInput[] {
  return lines.map((l) => ({
    product_id: l.productId,
    quantity: l.quantity,
    option_ids: l.options.map((o) => o.id),
    notes: l.note?.trim() || null,
  }));
}

/**
 * 1) Registra el pedido en el servidor (precios recalculados allí).
 * 2) Construye el mensaje con la respuesta del servidor.
 * 3) Devuelve el enlace de WhatsApp listo para abrir.
 */
export async function sendOrder(params: {
  slug: string;
  lines: CartLine[];
  customer: CustomerInfo;
  notes: string;
  expectedTotalCents: number;
  whatsapp: string;
}): Promise<SentOrder> {
  const order = await createOrder(params.slug, toOrderLines(params.lines), params.customer, params.notes.trim());
  return {
    code: order.code,
    link: waLink(params.whatsapp, buildOrderMessage(order)),
    totalUsd: Number(order.total_usd),
    totalBs: order.show_bs ? Number(order.total_bs) : null,
    priceChanged: toCents(order.total_usd) !== params.expectedTotalCents,
    at: Date.now(),
  };
}
