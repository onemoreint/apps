import { AtSign, Clock, MapPin, MessageCircle } from 'lucide-react';
import type { Catalogo } from '@/core/tipos';
import { enlaceWhatsApp } from '@/core/whatsapp';
import { enlace } from '@/app/ruta';

function redUrl(tipo: 'instagram' | 'facebook' | 'tiktok', valor: string): string {
  const v = valor.trim();
  if (/^https?:\/\//.test(v)) return v;
  const usuario = v.replace(/^@/, '');
  if (tipo === 'instagram') return `https://instagram.com/${usuario}`;
  if (tipo === 'facebook') return `https://facebook.com/${usuario}`;
  return `https://www.tiktok.com/@${usuario}`;
}

export function Pie({ catalogo }: { catalogo: Catalogo }) {
  const t = catalogo.tienda;
  const c = t.contenido ?? ({} as Catalogo['tienda']['contenido']);
  const redes = (['instagram', 'facebook', 'tiktok'] as const).filter((r) => c[r]?.trim());
  const telefono = t.whatsapp.replace(/^\+57/, '').replace(/(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3');

  return (
    <footer className="mt-6 bg-primario pb-20 sm:pb-0 text-en-primario">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-2xl font-semibold">{t.nombre}</p>
          {c.eslogan && <p className="mt-1 opacity-80">{c.eslogan}</p>}
        </div>
        <ul className="space-y-2 text-[15px] opacity-90">
          {t.whatsapp && (
            <li>
              <a href={enlaceWhatsApp(t.whatsapp)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:underline">
                <MessageCircle size={17} /> WhatsApp {telefono}
              </a>
            </li>
          )}
          {c.ciudad && (
            <li className="flex items-center gap-2">
              <MapPin size={17} /> {c.ciudad}
            </li>
          )}
          {c.horario_texto && (
            <li className="flex items-center gap-2">
              <Clock size={17} /> {c.horario_texto}
            </li>
          )}
          {c.correo && (
            <li>
              <a href={`mailto:${c.correo}`} className="inline-flex items-center gap-2 hover:underline">
                <AtSign size={17} /> {c.correo}
              </a>
            </li>
          )}
        </ul>
        <div className="space-y-2 text-[15px]">
          {redes.map((r) => (
            <a
              key={r}
              href={redUrl(r, c[r])}
              target="_blank"
              rel="noopener noreferrer"
              className="block capitalize opacity-90 hover:underline"
            >
              {r === 'tiktok' ? 'TikTok' : r}: {c[r].replace(/^https?:\/\/(www\.)?[^/]+\//, '@').replace(/^@?/, '@')}
            </a>
          ))}
          <a href={enlace('/privacidad')} className="block opacity-80 hover:underline">
            Política de privacidad
          </a>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs opacity-60">
        Pedidos en línea con Dulce Pedido · Los pedidos se confirman por WhatsApp
      </div>
    </footer>
  );
}
