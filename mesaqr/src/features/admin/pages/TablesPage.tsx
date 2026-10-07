import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Download, ExternalLink, Pencil, Plus, Printer, QrCode, RefreshCw } from 'lucide-react';
import { db } from '@/shared/lib/supabase';
import { adminMessage } from '@/shared/lib/errors';
import { toast } from '@/shared/ui/Toast';
import { Sheet } from '@/shared/ui/Sheet';
import { useAdmin } from '../AdminContext';
import { must, newToken, tableUrl, useLoad } from '../lib';
import { qrCardPng, qrSvg } from '../qr';
import type { DiningTable } from '../types';
import { Button, Empty, ErrorBox, Field, Input, Loading, PageHeader, Toggle } from '../ui';

export default function TablesPage() {
  const { business } = useAdmin();
  const [qrFor, setQrFor] = useState<DiningTable | null>(null);
  const [editing, setEditing] = useState<DiningTable | null>(null);
  const [adding, setAdding] = useState(false);

  const { data, setData, error, loading, reload } = useLoad(
    async () => must(await db().from('dining_tables').select('*').eq('business_id', business.id).order('number')) as DiningTable[],
    [business.id],
  );

  const flip = async (t: DiningTable, active: boolean) => {
    if (!data) return;
    setData(data.map((x) => (x.id === t.id ? { ...x, active } : x)));
    const { error: err } = await db().from('dining_tables').update({ active }).eq('id', t.id);
    if (err) {
      toast(adminMessage(err), 'warn');
      void reload();
    }
  };

  const nextNumber = data && data.length ? Math.max(...data.map((t) => t.number)) + 1 : 1;

  return (
    <>
      <PageHeader
        title="Mesas"
        action={
          <Button onClick={() => setAdding(true)} disabled={!data}>
            <Plus size={18} aria-hidden /> Agregar
          </Button>
        }
      >
        Cada mesa tiene su propio QR. Una mesa desactivada no puede recibir pedidos.
      </PageHeader>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && data.length === 0 && <Empty title="Sin mesas">Agrega tus mesas para generar sus códigos QR.</Empty>}

      {data && data.length > 0 && (
        <>
          <Link to="/dashboard/mesas/imprimir" className="mb-4 inline-flex h-11 items-center gap-2 rounded-xl bg-shelf px-4 font-semibold">
            <Printer size={18} aria-hidden /> Imprimir QR de todas las mesas
          </Link>
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.map((t) => (
              <li key={t.id} className={`flex items-center gap-3 rounded-2xl border border-line bg-paper p-3 ${t.active ? '' : 'opacity-55'}`}>
                <span className="ticket grid h-12 min-w-16 place-items-center rounded-lg px-3 font-display text-2xl font-extrabold tabular-nums">{t.number}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">Mesa {t.number}</span>
                  <span className="block truncate text-sm text-ink-3">{t.label ?? (t.active ? 'Activa' : 'Desactivada')}</span>
                </span>
                <Toggle checked={t.active} onChange={(v) => void flip(t, v)} label={`Mesa ${t.number} activa`} />
                <Button variant="ghost" aria-label={`Editar mesa ${t.number}`} onClick={() => setEditing(t)}>
                  <Pencil size={18} aria-hidden />
                </Button>
                <Button variant="secondary" aria-label={`Ver QR de la mesa ${t.number}`} onClick={() => setQrFor(t)}>
                  <QrCode size={18} aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}

      {adding && data && <AddTablesSheet next={nextNumber} existing={new Set(data.map((t) => t.number))} onClose={() => setAdding(false)} onDone={reload} />}
      {editing && <EditTableSheet table={editing} onClose={() => setEditing(null)} onDone={reload} />}
      {qrFor && (
        <QrSheet
          table={qrFor}
          onClose={() => setQrFor(null)}
          onRegenerated={(t) => {
            setQrFor(t);
            void reload();
          }}
        />
      )}
    </>
  );
}

function AddTablesSheet({ next, existing, onClose, onDone }: { next: number; existing: Set<number>; onClose: () => void; onDone: () => void }) {
  const { business } = useAdmin();
  const [from, setFrom] = useState(String(next));
  const [count, setCount] = useState('1');
  const [busy, setBusy] = useState(false);

  const start = parseInt(from, 10);
  const n = Math.min(50, Math.max(1, parseInt(count, 10) || 1));
  const numbers = Number.isFinite(start) && start > 0 ? Array.from({ length: n }, (_, i) => start + i).filter((x) => !existing.has(x) && x <= 9999) : [];

  const save = async () => {
    if (!numbers.length) return;
    setBusy(true);
    const { error } = await db().from('dining_tables').insert(numbers.map((number) => ({ business_id: business.id, number })));
    setBusy(false);
    if (error) toast(adminMessage(error), 'warn');
    else {
      toast(numbers.length === 1 ? `Mesa ${numbers[0]} creada` : `${numbers.length} mesas creadas`);
      onDone();
      onClose();
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Agregar mesas"
      footer={
        <Button className="w-full" busy={busy} disabled={!numbers.length} onClick={() => void save()}>
          {numbers.length > 1 ? `Crear mesas ${numbers[0]} a ${numbers[numbers.length - 1]}` : numbers.length ? `Crear mesa ${numbers[0]}` : 'Revisa los números'}
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 pb-2">
        <Field label="Desde la mesa número" htmlFor="tfrom">
          <Input id="tfrom" inputMode="numeric" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="Cuántas mesas" htmlFor="tcount" hint="Máximo 50 a la vez">
          <Input id="tcount" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
        </Field>
      </div>
      {numbers.length < n && <p className="pb-2 text-sm text-ink-3">Los números que ya existen se omiten.</p>}
    </Sheet>
  );
}

function EditTableSheet({ table, onClose, onDone }: { table: DiningTable; onClose: () => void; onDone: () => void }) {
  const [label, setLabel] = useState(table.label ?? '');
  const [number, setNumber] = useState(String(table.number));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const num = parseInt(number, 10);
    if (!Number.isFinite(num) || num < 1 || num > 9999) {
      toast('Número de mesa no válido', 'warn');
      return;
    }
    setBusy(true);
    const { error } = await db().from('dining_tables').update({ number: num, label: label.trim().slice(0, 40) || null }).eq('id', table.id);
    setBusy(false);
    if (error) toast(adminMessage(error), 'warn');
    else {
      onDone();
      onClose();
    }
  };

  const remove = async () => {
    if (!confirm(`¿Eliminar la mesa ${table.number}? Su QR dejará de funcionar. El historial de pedidos se conserva.`)) return;
    const { error } = await db().from('dining_tables').delete().eq('id', table.id);
    if (error) toast(adminMessage(error), 'warn');
    else {
      onDone();
      onClose();
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Mesa ${table.number}`}
      footer={
        <div className="flex gap-2">
          <Button className="flex-1" busy={busy} onClick={() => void save()}>
            Guardar
          </Button>
          <Button variant="danger" onClick={() => void remove()}>
            Eliminar
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pb-2">
        <Field label="Número" htmlFor="tnum">
          <Input id="tnum" inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value)} />
        </Field>
        <Field label="Nombre opcional" htmlFor="tlabel" hint="Ej.: Terraza, Barra. Aparece junto al número.">
          <Input id="tlabel" value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}

function QrSheet({ table, onClose, onRegenerated }: { table: DiningTable; onClose: () => void; onRegenerated: (t: DiningTable) => void }) {
  const { business } = useAdmin();
  const [svg, setSvg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void qrSvg(table.qr_token).then((s) => alive && setSvg(s));
    return () => {
      alive = false;
    };
  }, [table.qr_token]);

  const download = async () => {
    const url = await qrCardPng({
      token: table.qr_token,
      tableNumber: table.number,
      label: table.label,
      businessName: business.name,
      brand: business.primary_color,
    });
    const a = document.createElement('a');
    a.href = url;
    a.download = `mesa-${table.number}-qr.png`;
    a.click();
  };

  const regenerate = async () => {
    if (!confirm(`¿Generar un QR nuevo para la mesa ${table.number}? El QR impreso actual dejará de funcionar y tendrás que imprimir el nuevo.`)) return;
    setBusy(true);
    try {
      const updated = must(await db().from('dining_tables').update({ qr_token: newToken() }).eq('id', table.id).select().single()) as DiningTable;
      toast('QR nuevo generado. Imprímelo y reemplaza el anterior.');
      onRegenerated(updated);
    } catch (e) {
      toast(adminMessage(e), 'warn');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title={`QR de la mesa ${table.number}`}>
      <div className="mx-auto w-full max-w-72 rounded-2xl border border-line p-3">
        {svg ? <div className="[&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="aspect-square animate-pulse rounded-xl bg-shelf" />}
      </div>
      <p className="mt-3 text-center text-sm break-all text-ink-3">{tableUrl(table.qr_token)}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 pb-4">
        <Button variant="secondary" onClick={() => void download()}>
          <Download size={18} aria-hidden /> Descargar
        </Button>
        <Link to={`/dashboard/mesas/imprimir?ids=${table.id}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-shelf font-semibold">
          <Printer size={18} aria-hidden /> Imprimir
        </Link>
        <a
          href={tableUrl(table.qr_token)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-shelf font-semibold"
        >
          <ExternalLink size={18} aria-hidden /> Probar
        </a>
        <Button variant="ghost" busy={busy} onClick={() => void regenerate()}>
          <RefreshCw size={18} aria-hidden /> QR nuevo
        </Button>
      </div>
    </Sheet>
  );
}
