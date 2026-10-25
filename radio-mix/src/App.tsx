import { lazy, Suspense, useEffect, useState } from 'react';
import { Heart, Home as HomeIcon, LayoutGrid, Loader2, Radio, Search as SearchIcon } from 'lucide-react';
import { brand } from '@/config/brand';
import { useRoute, go, type Route } from '@/state/router';
import { useCatalogStore } from '@/state/catalog';
import { Logo } from '@/components/Logo';
import { MiniPlayer, ExpandedPlayer } from '@/components/Player';
import { InstallButton, IosInstallHelp, Splash, UpdateToast } from '@/components/pwa';
import { SpotifyEmbedSheet } from '@/spotify/PlaylistViews';
import { handleRedirect } from '@/spotify/spotify';
import { usePlayer } from '@/player/store';
import { Home } from '@/screens/Home';
import { Categories, CategoryDetail, Favorites, Search } from '@/screens/Browse';
import { Mine } from '@/screens/Mine';
import { Legal } from '@/screens/Legal';
import { LegalHub } from '@/screens/legalDocs';
import { SpotifyScreen } from '@/screens/SpotifyScreen';

const Admin = lazy(() => import('@/admin/Admin'));

const NAV: Array<{ key: Route['name']; to: string; label: string; icon: typeof HomeIcon }> = [
  { key: 'home', to: '/', label: 'Inicio', icon: HomeIcon },
  { key: 'categories', to: '/categorias', label: 'Categorías', icon: LayoutGrid },
  { key: 'search', to: '/buscar', label: 'Buscar', icon: SearchIcon },
  { key: 'favorites', to: '/favoritos', label: 'Favoritos', icon: Heart },
  { key: 'mine', to: '/mi-radio', label: 'Mi radio', icon: Radio },
];

function navActive(route: Route, key: Route['name']) {
  if (key === 'categories') return route.name === 'categories' || route.name === 'category';
  if (key === 'mine') return ['mine', 'legal', 'legalHub', 'admin', 'spotify'].includes(route.name);
  return route.name === key;
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <Home />;
    case 'categories':
      return <Categories />;
    case 'category':
      return <CategoryDetail id={route.id} />;
    case 'search':
      return <Search initial={route.q} />;
    case 'favorites':
      return <Favorites />;
    case 'mine':
      return <Mine />;
    case 'spotify':
      return <SpotifyScreen />;
    case 'legal':
      return <Legal doc={route.doc} />;
    case 'legalHub':
      return <LegalHub />;
    case 'admin':
      return (
        <Suspense
          fallback={
            <p className="flex items-center gap-2 text-muted">
              <Loader2 className="animate-spin" size={16} /> Cargando panel…
            </p>
          }
        >
          <Admin />
        </Suspense>
      );
  }
}

export default function App() {
  const route = useRoute();
  const hasPlayer = usePlayer((s) => !!s.station);
  const preview = useCatalogStore((s) => s.previewDraft && !!s.draft);
  const [oauthMsg, setOauthMsg] = useState<string | null>(null);

  useEffect(() => {
    handleRedirect()
      .then((r) => {
        if (r.handled) {
          setOauthMsg(r.error ?? 'Cuenta de Spotify conectada. Ve al panel → Spotify para importar tus playlists.');
          if (!r.error) go('/admin');
        }
      })
      .catch(() => setOauthMsg('No se pudo completar la conexión con Spotify.'));
  }, []);

  useEffect(() => {
    const titles: Partial<Record<Route['name'], string>> = { categories: 'Categorías', search: 'Buscar', favorites: 'Favoritos', mine: 'Mi radio', admin: 'Administración', spotify: 'Spotify', legalHub: 'Legal y seguridad' };
    const t = titles[route.name];
    document.title = t ? `${t} · ${brand.name}` : brand.name;
  }, [route.name]);

  return (
    <div className="ambient min-h-dvh">
      <Splash />
      <UpdateToast />
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[90] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-ink">
        Saltar al contenido
      </a>

      {/* Barra lateral (tableta y computador) */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-line bg-ink/80 p-5 backdrop-blur md:flex">
        <button type="button" onClick={() => go('/')} className="flex items-center gap-3 text-left">
          <Logo size={40} />
          <span className="font-display text-lg font-extrabold leading-tight">{brand.name}</span>
        </button>
        <nav className="mt-8 space-y-1" aria-label="Principal">
          {NAV.map(({ key, to, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => go(to)}
              aria-current={navActive(route, key) ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${navActive(route, key) ? 'bg-white/10 text-white' : 'text-muted hover:bg-white/5 hover:text-white'}`}
            >
              <Icon size={19} /> {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto">
          <InstallButton variant="card" />
        </div>
      </aside>

      {/* Cabecera (móvil) */}
      <header className="pt-safe sticky top-0 z-20 border-b border-line/60 bg-ink/85 backdrop-blur md:hidden">
        <div className="flex h-14 items-center gap-3 px-4">
          <button type="button" onClick={() => go('/')} className="flex items-center gap-2.5" aria-label={`${brand.name}: inicio`}>
            <Logo size={32} />
            <span className="font-display text-base font-extrabold">{brand.name}</span>
          </button>
          <span className="flex-1" />
          <InstallButton />
          <button type="button" onClick={() => go('/buscar')} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Buscar">
            <SearchIcon size={20} />
          </button>
        </div>
      </header>

      {preview && (
        <div className="bg-accent-2 px-4 py-1.5 text-center text-xs font-semibold text-ink md:ml-64">
          Vista previa del borrador (solo en este navegador).{' '}
          <button type="button" className="underline" onClick={() => useCatalogStore.getState().setPreviewDraft(false)}>
            Salir
          </button>
        </div>
      )}
      {oauthMsg && (
        <div role="status" className="bg-surface-2 px-4 py-2 text-center text-sm md:ml-64">
          {oauthMsg}{' '}
          <button type="button" className="text-muted underline" onClick={() => setOauthMsg(null)}>
            Cerrar
          </button>
        </div>
      )}

      <main id="contenido" className="md:pl-64">
        <div className={`mx-auto max-w-5xl px-4 pt-5 md:px-8 md:pt-8 ${hasPlayer ? 'pb-48 md:pb-32' : 'pb-28 md:pb-12'}`}>
        <Screen route={route} />
        <footer className="mt-12 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-4 text-xs text-muted">
          <span>© {new Date().getFullYear()} {brand.name}</span>
          <a href="#/fuentes" className="hover:text-white">
            Fuentes y licencias
          </a>
          <a href="#/privacidad" className="hover:text-white">
            Privacidad
          </a>
          <a href="#/condiciones" className="hover:text-white">
            Condiciones
          </a>
          <a href="#/cookies" className="hover:text-white">
            Cookies
          </a>
          <a href="#/seguridad" className="hover:text-white">
            Seguridad
          </a>
          <a href="#/derechos" className="hover:text-white">
            Derechos de autor
          </a>
        </footer>
        </div>
      </main>

      <MiniPlayer />
      <ExpandedPlayer />
      <SpotifyEmbedSheet />
      <IosInstallHelp />

      {/* Navegación inferior (móvil) */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 backdrop-blur md:hidden" aria-label="Principal">
        <div className="grid h-16 grid-cols-5">
          {NAV.map(({ key, to, label, icon: Icon }) => {
            const active = navActive(route, key);
            return (
              <button key={key} type="button" onClick={() => go(to)} aria-current={active ? 'page' : undefined} className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active ? 'text-accent' : 'text-muted'}`}>
                <Icon size={21} strokeWidth={active ? 2.4 : 2} />
                {label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
