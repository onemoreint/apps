import { useEffect, useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { db } from '@/shared/lib/supabase';
import { adminMessage } from '@/shared/lib/errors';
import { formatBs, formatUsd } from '@/shared/lib/money';
import { toast } from '@/shared/ui/Toast';
import { useAdmin } from '../AdminContext';
import { clockTime, must, timeAgo, useLoad } from '../lib';
import { STATUS_LABEL, type Order, type OrderStatus } from '../types';
import { ORDER_TYPE_EMOJI, ORDER_TYPE_LABEL } from '@/shared/types/menu';
import { Button, Empty, ErrorBox, Loading, PageHeader, Select } from '../ui';

type Filter = 'open' | 'all' | OrderStatus;
const OPEN: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready'];
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'open', label: 'En curso' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'completed', label: 'Entregados' },
  { id: 'cancelled', label: 'Cancelados' },
  { id: 'all', label: 'Todos' },
];
const FLOW: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];

const STATUS_TONE: Record<OrderStatus, string> = {
  draft: 'bg-shelf text-ink-2',
  pending: 'bg-mustard/50 text-ink',
  confirmed: 'bg-ink text-white',
  preparing: 'bg-ink text-white',
  ready: 'bg-send text-white',
  completed: 'bg-shelf text-ink-2',
  cancelled: 'bg-danger/10 text-danger',
};

export default function OrdersPage() {
  const { business } = useAdmin();
  const [filter, setFilter] = useState<Filter>('open');
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, setData, error, loading, reload } = useLoad(async () => {
    let q = db()
      .from('orders')
      .select('*, order_items(*, order_item_options(*))')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(60);
    if (filter === 'open') q = q.in('status', OPEN);
    else if (filter !== 'all') q = q.eq('status', filter);
    return must(await q) as Order[];
  }, [business.id, filter]);

  // Actualización automática cada 20 s mientras la pantalla está visible
  useEffect(() => {
    const t = window.setInterval(() => document.visibilityState === 'visible' && void reload(), 20000);
    return () => window.clearInterval(t);
  }, [reload]);

  const setStatus = async (o: Order, status: OrderStatus) => {
    if (!data) return;
    setData(data.map((x) => (x.id === o.id ? { ...x, status } : x)));
    const { error: err } = await db().from('orders').update({ status }).eq('id', o.id);
    if (err) {
      toast(adminMessage(err), 'warn');
      void reload();
    } else toast(`#${o.code}: ${STATUS_LABEL[status]}`);
  };

  return (
    <>
      <PageHeader
        title="Pedidos"
        action={
          <Button variant="secondary" onClick={() => void reload()} busy={loading && !!data} aria-label="Actualizar">
            <RefreshCw size={18} aria-hidden />
          </Button>
        }
      >
        Cada pedido llega también por WhatsApp con el mismo número. Si uno no llegó al chat, el cliente no pulsó Enviar.
      </PageHeader>

      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Filtrar pedidos">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`h-9 shrink-0 rounded-full px-4 text-sm font-semibold ${filter === f.id ? 'bg-ink text-white' : 'bg-paper text-ink-2 ring-1 ring-line'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && data.length === 0 && <Empty title="No hay pedidos aquí">Los pedidos nuevos aparecen solos cada 20 segundos.</Empty>}

      <ul className="space-y-3">
        {data?.map((o) => {
          const open = openId === o.id;
          return (
            <li key={o.id} className="rounded-2xl border border-line bg-paper">
              <button type="button" onClick={() => setOpenId(open ? null : o.id)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-extrabold">
                    #{o.code} <span className="font-sans text-base font-semibold">{o.customer_name}</span>
                  </p>
                  <p className="text-sm text-ink-2">
                    {o.order_type && `${ORDER_TYPE_EMOJI[o.order_type]} ${ORDER_TYPE_LABEL[o.order_type]} · `}
                    {clockTime(o.created_at)} · {timeAgo(o.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold tabular-nums">{formatUsd(Number(o.total_usd))}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                </div>
                <ChevronDown size={18} className={`shrink-0 text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              {open && (
                <div className="border-t border-line px-4 pt-3 pb-4">
                  <dl className="mb-3 space-y-1 rounded-xl bg-shelf px-3 py-2 text-sm">
                    {o.customer_phone && (
                      <div className="flex gap-2">
                        <dt className="font-semibold">Teléfono</dt>
                        <dd>
                          <a href={`tel:${o.customer_phone.replace(/[^0-9+]/g, '')}`} className="underline underline-offset-2">
                            {o.customer_phone}
                          </a>
                        </dd>
                      </div>
                    )}
                    {o.address && (
                      <div className="flex gap-2">
                        <dt className="font-semibold">Dirección</dt>
                        <dd>{o.address}</dd>
                      </div>
                    )}
                    {o.payment_method && (
                      <div className="flex gap-2">
                        <dt className="font-semibold">Pago</dt>
                        <dd>{o.payment_method}</dd>
                      </div>
                    )}
                  </dl>
                  <ul className="space-y-2">
                    {[...(o.order_items ?? [])]
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((it) => (
                        <li key={it.id} className="flex justify-between gap-3">
                          <span>
                            <span className="font-semibold">{it.quantity}×</span> {it.product_name}
                            {it.order_item_options.length > 0 && (
                              <span className="block text-sm text-ink-2">{it.order_item_options.map((x) => x.option_name).join(', ')}</span>
                            )}
                          </span>
                          <span className="tabular-nums">{formatUsd(Number(it.line_total_usd))}</span>
                        </li>
                      ))}
                  </ul>
                  {o.notes && <p className="mt-3 rounded-xl bg-shelf px-3 py-2 text-sm">📝 {o.notes}</p>}
                  <p className="mt-3 text-sm text-ink-3">
                    Total {formatUsd(Number(o.total_usd))} ≈ {formatBs(Number(o.total_bs))} (tasa {Number(o.exchange_rate)})
                  </p>
                  <label className="mt-3 block text-sm font-semibold" htmlFor={`st-${o.id}`}>
                    Estado
                  </label>
                  <Select id={`st-${o.id}`} value={o.status} onChange={(e) => void setStatus(o, e.target.value as OrderStatus)} className="mt-1">
                    {FLOW.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
