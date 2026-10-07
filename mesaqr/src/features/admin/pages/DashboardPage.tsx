import { useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle } from 'lucide-react';
import { db } from '@/shared/lib/supabase';
import { adminMessage } from '@/shared/lib/errors';
import { formatBs, formatUsd } from '@/shared/lib/money';
import { toast } from '@/shared/ui/Toast';
import { useAdmin } from '../AdminContext';
import { clockTime, must, startOfTodayCaracas, timeAgo, useLoad } from '../lib';
import { STATUS_LABEL, type Business, type Order } from '../types';
import { Button, Card, ErrorBox, Input, Loading, PageHeader } from '../ui';

const DEMO_WHATSAPP = '+580000000000';

export default function DashboardPage() {
  const { business } = useAdmin();
  const { data, error, loading, reload } = useLoad(async () => {
    const c = db();
    const head = { count: 'exact' as const, head: true };
    const [active, soldOut, tables, today, recent] = await Promise.all([
      c.from('products').select('id', head).eq('business_id', business.id).eq('active', true).eq('available', true),
      c.from('products').select('id', head).eq('business_id', business.id).eq('active', true).eq('available', false),
      c.from('dining_tables').select('id', head).eq('business_id', business.id).eq('active', true),
      c.from('orders').select('id', head).eq('business_id', business.id).gte('created_at', startOfTodayCaracas()),
      c.from('orders').select('id, code, table_number, status, total_usd, total_bs, exchange_rate, subtotal_usd, extras_usd, notes, created_at')
        .eq('business_id', business.id).order('created_at', { ascending: false }).limit(5),
    ]);
    for (const r of [active, soldOut, tables, today]) if (r.error) throw r.error;
    return {
      active: active.count ?? 0,
      soldOut: soldOut.count ?? 0,
      tables: tables.count ?? 0,
      today: today.count ?? 0,
      recent: must(recent) as Order[],
    };
  }, [business.id]);

  const warnings: { text: string; to: string }[] = [];
  if (business.whatsapp === DEMO_WHATSAPP) warnings.push({ text: 'Configura el número de WhatsApp que recibirá los pedidos.', to: '/dashboard/ajustes' });
  if (Date.now() - new Date(business.exchange_rate_updated_at).getTime() > 20 * 60 * 60 * 1000)
    warnings.push({ text: 'La tasa no se ha actualizado hoy. Escribe la tasa BCV del día abajo.', to: '/dashboard' });

  return (
    <>
      <PageHeader title="Inicio" />

      {warnings.map((w) => (
        <Link key={w.text} to={w.to} className="mb-3 flex items-start gap-3 rounded-2xl bg-mustard/35 p-4 font-medium">
          <AlertTriangle size={20} className="mt-0.5 shrink-0" aria-hidden /> {w.text}
        </Link>
      ))}

      <ExchangeRateCard />

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat to="/dashboard/pedidos" value={data.today} label="Pedidos hoy" />
            <Stat to="/dashboard/productos" value={data.active} label="Productos disponibles" />
            <Stat to="/dashboard/productos" value={data.soldOut} label="Agotados" warn={data.soldOut > 0} />
            <Stat to="/dashboard/mesas" value={data.tables} label="Mesas activas" />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Pedidos recientes</h2>
            <Link to="/dashboard/pedidos" className="text-sm font-semibold underline underline-offset-2">
              Ver todos
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <p className="mt-2 text-ink-2">Todavía no hay pedidos. Escanea el QR de una mesa para probar el flujo.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-paper">
              {data.recent.map((o) => (
                <li key={o.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="font-display font-extrabold">#{o.code}</span>
                  <span className="text-sm text-ink-2">
                    {clockTime(o.created_at)} · {timeAgo(o.created_at)}
                  </span>
                  <span className="ml-auto text-right">
                    <span className="block font-display font-bold tabular-nums">{formatUsd(Number(o.total_usd))}</span>
                    <span className="text-xs text-ink-3">{STATUS_LABEL[o.status]}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}

function Stat({ value, label, to, warn }: { value: number; label: string; to: string; warn?: boolean }) {
  return (
    <Link to={to} className="rounded-2xl border border-line bg-paper p-4">
      <span className={`block font-display text-3xl font-extrabold tabular-nums ${warn ? 'text-danger' : ''}`}>{value}</span>
      <span className="text-sm text-ink-2">{label}</span>
    </Link>
  );
}

/** La tasa cambia a diario: se actualiza en un toque desde el inicio. */
export function ExchangeRateCard() {
  const { business, setBusiness } = useAdmin();
  const [value, setValue] = useState(String(business.exchange_rate));
  const [busy, setBusy] = useState(false);
  const parsed = Number(value.replace(',', '.'));
  const valid = Number.isFinite(parsed) && parsed > 0 && parsed < 1e9;
  const changed = valid && parsed !== Number(business.exchange_rate);

  const save = async () => {
    setBusy(true);
    try {
      const updated = must(
        await db().from('businesses').update({ exchange_rate: parsed }).eq('id', business.id).select().single(),
      ) as Business;
      setBusiness(updated);
      toast('Tasa actualizada');
    } catch (e) {
      toast(adminMessage(e), 'warn');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-40 flex-1">
          <label htmlFor="rate" className="mb-1.5 block text-sm font-semibold">
            Tasa del día (Bs. por 1 USD)
          </label>
          <Input
            id="rate"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={!valid}
            onKeyDown={(e) => e.key === 'Enter' && changed && void save()}
          />
        </div>
        <Button onClick={save} busy={busy} disabled={!changed}>
          Guardar tasa
        </Button>
      </div>
      <p className="mt-2 text-sm text-ink-3">
        {valid ? `Ej.: ${formatUsd(7)} ≈ ${formatBs(7 * parsed)}` : 'Escribe un número mayor que cero.'} · Actualizada{' '}
        {timeAgo(business.exchange_rate_updated_at)}
        {!business.show_bs && ' · Los precios en Bs. están ocultos en el menú'}
      </p>
    </Card>
  );
}
