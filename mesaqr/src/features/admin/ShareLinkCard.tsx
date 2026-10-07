import { Copy, ExternalLink, Share2 } from 'lucide-react';
import { toast } from '@/shared/ui/Toast';
import { useAdmin } from './AdminContext';
import { menuUrl } from './lib';
import { Card } from './ui';

/** El único enlace del menú: copiar, compartir por WhatsApp o abrirlo. */
export function ShareLinkCard() {
  const { business } = useAdmin();
  const url = menuUrl();
  const text = `Haz tu pedido en ${business.name} aquí 👉 ${url}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast('Enlace copiado');
    } catch {
      toast('No se pudo copiar. Mantén presionado el enlace para copiarlo.', 'warn');
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: business.name, text: `Haz tu pedido en ${business.name}`, url });
        return;
      } catch {
        /* el usuario canceló: no pasa nada */
        return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  return (
    <Card>
      <h2 className="font-display text-lg font-bold">Enlace de tu menú</h2>
      <p className="mt-1 text-sm text-ink-2">Compártelo por WhatsApp, Instagram o estados. Es el mismo enlace para todos tus clientes.</p>
      <p className="mt-3 rounded-xl bg-shelf px-3 py-2.5 font-medium break-all select-all">{url}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => void copy()} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-shelf font-semibold">
          <Copy size={18} aria-hidden /> Copiar
        </button>
        <button type="button" onClick={() => void share()} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-send font-semibold text-white">
          <Share2 size={18} aria-hidden /> Compartir
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-shelf font-semibold">
          <ExternalLink size={18} aria-hidden /> Abrir
        </a>
      </div>
    </Card>
  );
}
