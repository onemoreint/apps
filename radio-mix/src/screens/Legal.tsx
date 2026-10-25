import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { brand } from '@/config/brand';
import { useCatalog } from '@/state/catalog';
import { isPlayable } from '@/lib/validate';

function Doc({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="max-w-2xl space-y-4 text-sm leading-relaxed text-soft [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc">
      <h1 className="font-display text-3xl font-extrabold text-white">{title}</h1>
      <p className="text-xs text-muted">Última actualización: {brand.legalUpdated}</p>
      {children}
    </article>
  );
}

export function Legal({ doc }: { doc: 'privacidad' | 'condiciones' | 'fuentes' }) {
  if (doc === 'privacidad') return <Privacy />;
  if (doc === 'condiciones') return <Terms />;
  return <Sources />;
}

function Privacy() {
  return (
    <Doc title="Política de privacidad">
      <p>
        {brand.name} es una aplicación web operada por {brand.contact.owner}. Está pensada para escuchar música sin crear cuentas y guarda lo mínimo posible.
      </p>
      <h2>Qué se guarda y dónde</h2>
      <ul>
        <li>Tus emisoras favoritas, las escuchadas recientemente, el volumen y las playlists que añadas se guardan <b>solo en tu dispositivo</b> (almacenamiento local del navegador). No se envían a ningún servidor nuestro.</li>
        <li>La app instalada guarda en caché sus propios archivos para abrir rápido. No guarda audio.</li>
        <li>No usamos cookies publicitarias, analítica ni perfiles de usuario.</li>
      </ul>
      <h2>Servicios de terceros</h2>
      <ul>
        <li>
          <b>Fuentes de audio</b> (por ejemplo, Internet Archive o el servidor de cada emisora): al reproducir, tu navegador se conecta directamente a ellas, que reciben tu dirección IP como en cualquier
          visita web.
        </li>
        <li>
          <b>Spotify</b>: al abrir una playlist se carga el reproductor oficial de Spotify, que aplica su propia política de privacidad. Si el administrador conecta su cuenta, el permiso de acceso se guarda
          solo en la pestaña abierta y se borra al cerrarla.
        </li>
        <li>
          <b>GitHub Pages</b> aloja la aplicación y puede registrar datos técnicos de acceso.
        </li>
      </ul>
      <h2>Tus derechos</h2>
      <p>
        Puedes borrar todos tus datos desde «Mi radio → Borrar mis datos de este dispositivo» o desde la configuración de tu navegador. Para cualquier consulta escribe a{' '}
        <a className="text-accent-3 underline" href={`mailto:${brand.contact.email}`}>
          {brand.contact.email}
        </a>
        . En Colombia aplican la Ley 1581 de 2012 y sus normas reglamentarias.
      </p>
    </Doc>
  );
}

function Terms() {
  return (
    <Doc title="Condiciones de uso">
      <ul>
        <li>La app es gratuita y se ofrece «tal cual». Las emisoras dependen de servidores externos y pueden dejar de estar disponibles sin aviso.</li>
        <li>Está permitido escuchar para uso personal. No está permitido grabar, descargar o retransmitir el audio, salvo lo que permita la licencia de cada obra (ver «Fuentes y licencias»).</li>
        <li>Cada emisora indica su licencia o permiso de difusión. Las obras con licencia CC BY deben atribuirse como se indica.</li>
        <li>Las playlists de Spotify se escuchan con el reproductor de Spotify y bajo sus condiciones. La radio no aloja ni retransmite contenido de Spotify.</li>
        <li>
          La reproducción en segundo plano depende del sistema operativo: en iPhone/iPad el audio de las apps web puede detenerse al bloquear la pantalla o cambiar de app; en Android suele continuar, según
          el navegador y el ahorro de batería.
        </li>
        <li>
          Si eres titular de derechos y crees que alguna fuente no debería estar aquí, escribe a{' '}
          <a className="text-accent-3 underline" href={`mailto:${brand.contact.email}`}>
            {brand.contact.email}
          </a>{' '}
          y la retiraremos mientras se revisa.
        </li>
      </ul>
    </Doc>
  );
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
