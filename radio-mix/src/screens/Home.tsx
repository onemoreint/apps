import { ChevronRight, Radio, Search } from 'lucide-react';
import { brand } from '@/config/brand';
import { categoryIsLive, playableStations, sortedCategories, stationsOf, useCatalog } from '@/state/catalog';
import { useLibrary } from '@/state/library';
import { usePlayer } from '@/player/store';
import { go } from '@/state/router';
import { StationCard } from '@/components/StationCard';
import { CategoryCard } from '@/components/CategoryCard';
import { InstallButton } from '@/components/pwa';
import { PlaylistCard } from '@/spotify/PlaylistViews';
import { Section } from '@/components/Section';
import { statusText } from '@/components/Player';

export function Home() {
  const catalog = useCatalog();
  const cats = sortedCategories(catalog);
  const catById = new Map(catalog.categories.map((c) => [c.id, c]));
  const live = playableStations(catalog);
  const popular = live.filter((s) => s.popular).concat(live.filter((s) => !s.popular)).slice(0, 8);
  const favorites = useLibrary((s) => s.favorites);
  const myPlaylists = useLibrary((s) => s.myPlaylists);
  const favStations = favorites.map((id) => catalog.stations.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s);
  const current = usePlayer((s) => s.station);
  const status = usePlayer((s) => s.status);
  const np = usePlayer((s) => s.nowPlaying);
  const playlists = [...catalog.playlists, ...myPlaylists.filter((p) => !catalog.playlists.some((c) => c.id === p.id))];
  const liveCats = cats.filter((c) => categoryIsLive(catalog, c.id));

  return (
    <div className="space-y-8">
      <section className="pt-2">
        <p className="text-sm text-muted">{brand.tagline}</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
          ¿Qué quieres <span className="text-accent">escuchar</span> hoy?
        </h1>
        <form
          role="search"
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            const q = new FormData(e.currentTarget).get('q')?.toString() ?? '';
            go(`/buscar?q=${encodeURIComponent(q)}`);
          }}
        >
          <label className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 focus-within:border-accent/60">
            <Search size={20} className="text-muted" />
            <input name="q" type="search" placeholder="Busca un género, emisora o ritmo…" className="w-full bg-transparent text-base outline-none placeholder:text-muted" aria-label="Buscar" />
          </label>
        </form>
      </section>

      <Section title="Escuchando ahora">
        {current ? (
          <div>
            <StationCard station={current} category={catById.get(current.categoryId)} />
            <p className="mt-2 px-1 text-xs text-muted">
              {statusText[status]}
              {np?.title ? ` · ${np.title}${np.artist ? ` — ${np.artist}` : ''}` : ''}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
            <Radio className="shrink-0 text-accent" />
            <p>
              Elige una emisora y pulsa <b className="text-white">reproducir</b>. Hay {live.length} {live.length === 1 ? 'emisora' : 'emisoras'} transmitiendo en {liveCats.length}{' '}
              {liveCats.length === 1 ? 'categoría' : 'categorías'}.
            </p>
          </div>
        )}
      </Section>

      <Section title="Categorías" action={{ label: 'Ver todas', onClick: () => go('/categorias') }}>
        <div className="scroll-x -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {[...liveCats, ...cats.filter((c) => !liveCats.includes(c))].slice(0, 10).map((c) => (
            <div key={c.id} className="w-40 shrink-0">
              <CategoryCard category={c} live={categoryIsLive(catalog, c.id)} count={stationsOf(catalog, c.id).length} compact />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Emisoras populares">
        {popular.length ? (
          <div className="scroll-x -mx-4 flex gap-4 overflow-x-auto px-4 pb-1">
            {popular.map((s) => (
              <StationCard key={s.id} station={s} category={catById.get(s.categoryId)} layout="tile" />
            ))}
          </div>
        ) : (
          <Empty text="Todavía no hay emisoras configuradas." />
        )}
      </Section>

      <Section title="Tus favoritas" action={favStations.length ? { label: 'Ver', onClick: () => go('/favoritos') } : undefined}>
        {favStations.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {favStations.slice(0, 4).map((s) => (
              <StationCard key={s.id} station={s} category={catById.get(s.categoryId)} />
            ))}
          </div>
        ) : (
          <Empty text="Toca el corazón de una emisora para tenerla siempre a mano." />
        )}
      </Section>

      <Section title="Playlists de Spotify" action={{ label: 'Más', onClick: () => go('/spotify') }}>
        {playlists.length ? (
          <div className="scroll-x -mx-4 flex gap-4 overflow-x-auto px-4 pb-1">
            {playlists.map((p) => (
              <PlaylistCard key={p.id} playlist={p} />
            ))}
          </div>
        ) : (
          <button type="button" onClick={() => go('/spotify')} className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface p-4 text-left text-sm text-muted hover:bg-surface-2">
            Aún no hay playlists conectadas. Añade un enlace de Spotify.
            <ChevronRight size={18} />
          </button>
        )}
      </Section>

      <InstallButton variant="card" />
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">{text}</p>;
}
