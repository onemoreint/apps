/**
 * Llamadas públicas a Supabase con fetch directo (PostgREST /rest/v1/rpc).
 * Evita cargar @supabase/supabase-js en el menú → el cliente descarga mucho menos.
 */
import type { CreatedOrder, Menu } from '@/shared/types/menu';
import { ApiError, toApiError } from './errors';
import { DEMO_MODE, SUPABASE_ANON_KEY, SUPABASE_URL } from './env';
import { demoCreateOrder, demoFetchMenu } from './demoApi';

export interface OrderLineInput {
  product_id: string;
  quantity: number;
  option_ids: string[];
}

async function rpc<T>(fn: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        // Las claves "anon" antiguas son JWT y van también como Bearer; las nuevas
        // "sb_publishable_…" solo deben ir en apikey.
        ...(SUPABASE_ANON_KEY.startsWith('eyJ') ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError('NETWORK');
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw toApiError(data ?? { message: `HTTP ${res.status}` });
  return data as T;
}

export function fetchMenu(token: string, signal?: AbortSignal): Promise<Menu> {
  if (DEMO_MODE) return demoFetchMenu(token);
  return rpc<Menu>('get_menu', { p_token: token }, signal);
}

export function createOrder(token: string, items: OrderLineInput[], notes: string): Promise<CreatedOrder> {
  if (DEMO_MODE) return demoCreateOrder(token, items, notes);
  return rpc<CreatedOrder>('create_order', { p_token: token, p_items: items, p_notes: notes || null });
}
