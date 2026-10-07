import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, Printer } from 'lucide-react';
import { db } from '@/shared/lib/supabase';
import { useAdmin } from '../AdminContext';
import { must, useLoad } from '../lib';
import { qrSvg } from '../qr';
import type { DiningTable } from '../types';
import { ErrorBox, Loading } from '../ui';

/** Hoja de impresión: identificadores de mesa de ~8 × 11 cm, 4 por hoja carta/A4. */
export default function PrintQrPage() {
  const { business } = useAdmin();
  const [params] = useSearchParams();
  const ids = params.get('ids')?.split(',').filter(Boolean) ?? [];
  const [svgs, setSvgs] = useState<Record<string, string>>({});

  const { data, error, loading, reload } = useLoad(async () => {
    let q = db().from('dining_tables').select('*').eq('business_id', business.id).eq('active', true).order('number');
    if (ids.length) q = q.in('id', ids);
    return must(await q) as DiningTable[];
  }, [business.id, ids.join(',')]);

  useEffect(() => {
    if (!data) return;
    let alive = true;
    void Promise.all(data.map(async (t) => [t.id, await qrSvg(t.qr_token)] as const)).then((pairs) => alive && setSvgs(Object.fromEntries(pairs)));
    return () => {
      alive = false;
    };
  }, [data]);

  const ready = data && data.every((t) => svgs[t.id]);

  return (
    <div className="min-h-dvh bg-shelf print:bg-white">
      <style>{`@page { size: auto; margin: 10mm; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`}</style>
      <div className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-paper px-4 py-3">
        <Link to="/dashboard/mesas" className="inline-flex items-center gap-1 font-semibold">
          <ArrowLeft size={18} aria-hidden /> Mesas
        </Link>
        <span className="text-sm text-ink-3">{data ? `${data.length} QR` : ''}</span>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!ready}
          className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-4 font-semibold text-white disabled:opacity-50"
        >
          <Printer size={18} aria-hidden /> Imprimir
        </button>
      </div>

      <div className="p-4 print:p-0">
        {error && <ErrorBox message={error} onRetry={reload} />}
        {loading && !data && <Loading />}
        {data && data.length === 0 && <p className="text-ink-2">No hay mesas activas para imprimir.</p>}
        <div className="mx-auto grid max-w-[180mm] grid-cols-2 gap-[6mm]">
          {data?.map((t) => (
            <article
              key={t.id}
              className="flex h-[118mm] break-inside-avoid flex-col items-center overflow-hidden rounded-[5mm] border-[0.4mm] border-ink/25 bg-white text-center"
            >
              <div className="w-full px-[4mm] py-[3.5mm] font-display text-[5.5mm] leading-tight font-extrabold text-white" style={{ background: business.primary_color }}>
                {business.name}
              </div>
              <p className="mt-[4mm] font-display text-[5mm] font-bold">Escanea para ver el menú</p>
              <div className="mt-[2mm] w-[56mm] [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svgs[t.id] ?? '' }} />
              <div className="ticket mt-[3mm] rounded-[2.5mm] px-[7mm] py-[1.5mm] font-display text-[11mm] leading-none font-extrabold [print-color-adjust:exact]">
                Mesa {t.number}
              </div>
              <p className="mt-auto mb-[4mm] px-[4mm] text-[3.4mm] text-ink-2">{t.label ?? 'Pide desde tu teléfono por WhatsApp'}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
