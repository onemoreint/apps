import { useMemo, useState } from 'react';
import { ArrowLeft, Clock, Search as SearchIcon } from 'lucide-react';
import { categoryIsLive, sortedCategories, stationsOf, useCatalog } from '@/state/catalog';
import { useLibrary } from '@/state/library';
import { go } from '@/state/router';
import { CategoryCard } from '@/components/CategoryCard';
import { StationCard } from '@/components/StationCard';
import { Cover } from '@/components/Cover';
import { PlaylistCard } from '@/spotify/PlaylistViews';
import { Section } from '@/components/Section';
import { Empty } from './Home';

export function Categories() {
  const catalog = useCatalog();
  const cats = sortedCategories(catalog);
  const live = cats.filter((c) => categoryIsLive(catalog, c.id)).length;
  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Categorías</h1>
      <p className="mt-1 text-sm text-muted">
        {live} de {cats.length} categorías tienen emisoras en vivo. Las demás se activan cuando se configura una fuente con licencia.
      </p>
      <div className="mt-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3">
        {cats.map((c) => (
          <CategoryCard key={c.id} category={c} live={categoryIsLive(catalog, c.id)} count={stationsOf(catalog, c.id).length} />
        ))}
      </div>
    </div>
  );
}

export function CategoryDetail({ id }: { id: string }) {
  const catalog = useCatalog();
  const category = catalog.categories.find((c) => c.id === id);
  if (!category) {
    return (
      <div>
        <BackLink />
        <Empty text="Esta categoría no existe o fue retirada." />
      </div>
    );
  }
  const stations = stationsOf(catalog, id);
  const playlists = catalog.playlists.filter((p) => p.categoryId === id);
  const live = categoryIsLive(catalog, id);
  return (
    <div className="space-y-6">
      <BackLink />
      <header className="flex items-end gap-4">
        <Cover category={category} className="h-28 w-28 shrink-0 text-2xl sm:h-36 sm:w-36" />
        <div>
          <h1 className="font-display text-3xl font-extrabold leading-tight">{category.name}</h1>
          <p className="mt-1 text-sm text-muted">{category.description}</p>
        </div>
      </header>

      <Section title="Emisoras">
        {stations.length ? (
          <div className="grid gap-3">
            {stations.map((s) => (
              <StationCard key={s.id} station={s} category={category} />
            ))}
          </div>
        ) : null}
        {!live && (
          <div className="mt-3 flex gap-3 rounded-2xl border border-line bg-surface p-4 text-sm text-soft">
            <Clock className="mt-0.5 shrink-0 text-accent-2" />
            <div>
              <p className="font-semibold">Pendiente de configuración</p>
              <p className="mt-1 text-muted">
                Esta categoría todavía no tiene una fuente de audio con permiso para difundirse aquí, así que no transmite. No mostramos señales simuladas. Mientras tanto, puedes escuchar las
                playlists de Spotify de abajo (si hay) o elegir otra categoría.
              </p>
            </div>
          </div>
        )}
      </Section>

      {playlists.length > 0 && (
        <Section title="Playlists de Spotify">
          <div className="scroll-x -mx-4 flex gap-4 overflow-x-auto px-4 pb-1">
            {playlists.map((p) => (
              <PlaylistCard key={p.id} playlist={p} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <button type="button" onClick={() => (history.length > 1 ? history.back() : go('/categorias'))} className="inline-flex items-center gap-1 text-sm text-muted hover:text-white">
      <ArrowLeft size={16} /> Volver
    </button>
  );
}

/** Normaliza para buscar sin importar tildes ni mayúsculas. */
export function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function Search({ initial }: { initial: string }) {
  const catalog = useCatalog();
  const [q, setQ] = useState(initial);
  const catById = new Map(catalog.categories.map((c) => [c.id, c]));
  const results = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return { cats: [], stations: [] };
    const words = n.split(/\s+/);
    const match = (text: string) => words.every((w) => norm(text).includes(w));
    return {
      cats: sortedCategories(catalog).filter((c) => match(`${c.name} ${c.description}`)),
      stations: catalog.stations.filter((s) => s.active && match(`${s.name} ${s.description} ${catById.get(s.categoryId)?.name ?? ''}`)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, catalog]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-extrabold">Buscar</h1>
      <label className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 focus-within:border-accent/60">
        <SearchIcon size={20} className="text-muted" />
        <input
          autoFocus
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            history.replaceState(null, '', `#/buscar?q=${encodeURIComponent(e.target.value)}`);
          }}
          placeholder="Salsa, vallenato, relajación…"
          className="w-full bg-transparent text-base outline-none placeholder:text-muted"
          aria-label="Buscar emisoras y categorías"
        />
      </label>
      {!q.trim() ? (
        <div className="flex flex-wrap gap-2">
          {sortedCategories(catalog).map((c) => (
            <button key={c.id} type="button" onClick={() => setQ(c.name)} className="rounded-full border border-line px-3 py-1.5 text-sm text-soft hover:bg-white/5">
              {c.glyph} {c.name}
            </button>
          ))}
        </div>
      ) : results.cats.length + results.stations.length === 0 ? (
        <Empty text={`No encontramos nada para “${q}”. Prueba con otro género o palabra.`} />
      ) : (
        <>
          {results.stations.length > 0 && (
            <Section title="Emisoras">
              <div className="grid gap-3">
                {results.stations.map((s) => (
                  <StationCard key={s.id} station={s} category={catById.get(s.categoryId)} />
                ))}
              </div>
            </Section>
          )}
          {results.cats.length > 0 && (
            <Section title="Categorías">
              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                {results.cats.map((c) => (
                  <CategoryCard key={c.id} category={c} live={categoryIsLive(catalog, c.id)} count={stationsOf(catalog, c.id).length} compact />
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

export function Favorites() {
  const catalog = useCatalog();
  const favorites = useLibrary((s) => s.favorites);
  const catById = new Map(catalog.categories.map((c) => [c.id, c]));
  const stations = favorites.map((id) => catalog.stations.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s);
  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-extrabold">Favoritos</h1>
      {stations.length ? (
        <div className="grid gap-3">
          {stations.map((s) => (
            <StationCard key={s.id} station={s} category={catById.get(s.categoryId)} />
          ))}
        </div>
      ) : (
        <Empty text="Aún no tienes favoritas. Toca el corazón ♥ de cualquier emisora y aparecerá aquí, incluso después de cerrar la app." />
      )}
      <p className="text-xs text-muted">Tus favoritos se guardan solo en este dispositivo.</p>
    </div>
  );
}
