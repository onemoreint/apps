import { ExternalLink } from 'lucide-react';
import { useCatalog } from '@/state/catalog';
import { isPlayable } from '@/lib/validate';
import { Copyright, Cookies, Doc, Privacy, Security, Terms, type LegalDoc } from './legalDocs';

export function Legal({ doc }: { doc: LegalDoc }) {
  switch (doc) {
    case 'privacidad':
      return <Privacy />;
    case 'condiciones':
      return <Terms />;
    case 'seguridad':
      return <Security />;
    case 'cookies':
      return <Cookies />;
    case 'derechos':
      return <Copyright />;
    default:
      return <Sources />;
  }
}

function Sources() {
  const catalog = useCatalog();
  const catName = new Map(catalog.categories.map((c) => [c.id, c.name]));
  return (
    <Doc title="Fuentes y licencias">
      <p>Solo se reproducen fuentes con un permiso verificable para difundirse públicamente en esta app. Una URL pública no es, por sí sola, un permiso.</p>
      <div className="space-y-3">
        {catalog.stations.map((s) => (
          <section key={s.id} className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="!mt-0 font-display text-base font-bold text-white">{s.name}</h2>
            <p className="text-xs text-muted">
              {catName.get(s.categoryId)} · {isPlayable(s) ? 'Activa' : 'Inactiva'}
              {s.verifiedAt ? ` · comprobada el ${s.verifiedAt}` : ''}
            </p>
            <p className="mt-2">
              <b>Licencia:</b> {s.license.name}. {s.license.notes}
            </p>
            {s.license.attribution && <p className="mt-1 text-muted">{s.license.attribution}</p>}
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              {s.license.url && (
                <a className="inline-flex items-center gap-1 text-accent-3 hover:underline" href={s.license.url} target="_blank" rel="noopener noreferrer">
                  Licencia <ExternalLink size={12} />
                </a>
              )}
              {s.website && (
                <a className="inline-flex items-center gap-1 text-accent-3 hover:underline" href={s.website} target="_blank" rel="noopener noreferrer">
                  Fuente <ExternalLink size={12} />
                </a>
              )}
            </div>
          </section>
        ))}
      </div>
      <h2>Música comercial (salsa, vallenato, reguetón, pop…)</h2>
      <p>
        Las canciones comerciales tienen derechos de autor y conexos. Para difundirlas públicamente en internet la emisora necesita las licencias de comunicación pública de cada país donde se ofrezca:
        en Colombia, ante la Organización Sayco-Acinpro (OSA) para autores y artistas/productores; en Venezuela, ante SACVEN y AVINPRO; y en otros países, ante sus sociedades de gestión. Por eso esas
        categorías aparecen como «pendiente de configuración» hasta que se conecte un stream que cuente con esas licencias.
      </p>
      <h2>Spotify</h2>
      <p>
        Las playlists se muestran con los datos públicos y el reproductor embebido oficial de Spotify. La app no descarga, graba ni retransmite audio de Spotify, ni lo usa como fuente de la radio.
      </p>
    </Doc>
  );
}
