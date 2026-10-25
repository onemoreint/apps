import { ChevronRight, FileText, Info, ListMusic, Mail, MessageCircle, Settings, Shield, Trash2 } from 'lucide-react';
import { brand } from '@/config/brand';
import { useCatalog } from '@/state/catalog';
import { useLibrary } from '@/state/library';
import { go } from '@/state/router';
import { StationCard } from '@/components/StationCard';
import { InstallButton, isStandalone } from '@/components/pwa';
import { Section } from '@/components/Section';
import { Empty } from './Home';

export function Mine() {
  const catalog = useCatalog();
  const recents = useLibrary((s) => s.recents);
  const catById = new Map(catalog.categories.map((c) => [c.id, c]));
  const recentStations = recents.map((id) => catalog.stations.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s);

  const links = [
    { icon: ListMusic, label: 'Playlists de Spotify', to: '/spotify' },
    { icon: Info, label: 'Fuentes y licencias', to: '/fuentes' },
    { icon: Shield, label: 'Política de privacidad', to: '/privacidad' },
    { icon: FileText, label: 'Condiciones de uso', to: '/condiciones' },
    { icon: Settings, label: 'Panel de administración', to: '/admin' },
  ];

  return (
    <div className="space-y-7">
      <h1 className="font-display text-3xl font-extrabold">Mi radio</h1>

      <InstallButton variant="card" />
      {isStandalone() && <p className="rounded-2xl bg-accent-3/10 p-3 text-sm text-accent-3">Estás usando la app instalada.</p>}

      <Section title="Escuchado recientemente">
        {recentStations.length ? (
          <div className="grid gap-3">
            {recentStations.slice(0, 5).map((s) => (
              <StationCard key={s.id} station={s} category={catById.get(s.categoryId)} />
            ))}
          </div>
        ) : (
          <Empty text="Aquí verás las emisoras que escuches." />
        )}
      </Section>

      <nav aria-label="Más opciones" className="overflow-hidden rounded-2xl border border-line">
        {links.map(({ icon: Icon, label, to }) => (
          <button key={to} type="button" onClick={() => go(to)} className="flex w-full items-center gap-3 border-b border-line bg-surface px-4 py-3.5 text-left last:border-0 hover:bg-surface-2">
            <Icon size={18} className="text-muted" />
            <span className="flex-1 text-sm">{label}</span>
            <ChevronRight size={16} className="text-muted" />
          </button>
        ))}
      </nav>

      <Section title="Contacto">
        <div className="flex flex-wrap gap-2">
          <a href={`https://wa.me/${brand.contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm hover:bg-white/5">
            <MessageCircle size={16} className="text-[#25d366]" /> WhatsApp
          </a>
          <a href={`mailto:${brand.contact.email}`} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm hover:bg-white/5">
            <Mail size={16} className="text-accent-2" /> Correo
          </a>
        </div>
      </Section>

      <button
        type="button"
        onClick={() => {
          if (confirmClear()) {
            ['favorites', 'recents', 'myPlaylists', 'oembed', 'volume'].forEach((k) => localStorage.removeItem(`radiomix:${k}`));
            location.reload();
          }
        }}
        className="inline-flex items-center gap-2 text-xs text-muted hover:text-accent"
      >
        <Trash2 size={14} /> Borrar mis datos de este dispositivo
      </button>
      <p className="text-xs text-muted">
        {brand.name} · versión {__APP_VERSION__}
      </p>
    </div>
  );
}

function confirmClear() {
  return window.confirm('¿Borrar favoritos, recientes y playlists guardadas en este dispositivo?');
}
