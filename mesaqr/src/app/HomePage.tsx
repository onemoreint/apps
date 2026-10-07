import { useEffect, useState } from 'react';
import { QrCode } from 'lucide-react';
import { loadTable } from '@/features/menu/tableSession';
import { DASHBOARD_PATH, DEMO_MODE, menuPath } from '@/shared/lib/env';
import { loadDemoData, type DemoData } from '@/shared/lib/demoApi';
import { Link, href } from './nav';

/** Inicio: a quien llega sin QR se le explica qué hacer; si ya escaneó, vuelve a su mesa. */
export default function HomePage() {
  const token = loadTable();
  const [demoTables, setDemoTables] = useState<DemoData['tables']>([]);

  useEffect(() => {
    if (DEMO_MODE) void loadDemoData().then((d) => setDemoTables(d.tables)).catch(() => undefined);
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-12">
      <div className="my-auto">
        <QrCode size={56} strokeWidth={1.75} aria-hidden />
        <h1 className="mt-5 font-display text-4xl leading-[1.05] font-extrabold tracking-tight">Escanea. Elige. Envía tu pedido.</h1>
        <p className="mt-4 text-lg text-ink-2">Apunta la cámara de tu teléfono al código QR de tu mesa para ver el menú y pedir por WhatsApp.</p>
        {token && (
          <Link to={menuPath(token)} className="mt-8 inline-flex h-12 items-center rounded-full bg-brand px-6 font-display font-bold text-brand-ink">
            Volver al menú de mi mesa
          </Link>
        )}
        {DEMO_MODE && demoTables.length > 0 && (
          <section className="mt-10" aria-labelledby="demo-title">
            <h2 id="demo-title" className="font-display text-lg font-bold">
              Prueba el menú sin escanear
            </h2>
            <p className="mt-1 text-sm text-ink-2">Elige una mesa, como si hubieras escaneado su QR.</p>
            <ul className="mt-3 grid grid-cols-4 gap-2">
              {demoTables.map((t) => (
                <li key={t.token}>
                  <Link
                    to={menuPath(t.token)}
                    className="ticket grid h-12 place-items-center rounded-lg font-display text-lg font-extrabold tabular-nums"
                    aria-label={`Mesa ${t.number}`}
                  >
                    {t.number}
                  </Link>
                </li>
              ))}
            </ul>
            <a href={href('/qr/')} className="mt-4 inline-block text-sm font-semibold underline underline-offset-2">
              Ver e imprimir los QR de las mesas
            </a>
          </section>
        )}
      </div>
      <a href={href(DASHBOARD_PATH)} className="mt-10 text-sm text-ink-3 underline underline-offset-2">
        Acceso del restaurante
      </a>
    </main>
  );
}
