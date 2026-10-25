import { Heart, Loader2, Pause, Play, AlertTriangle } from 'lucide-react';
import type { Category, Station } from '@/lib/types';
import { usePlayer } from '@/player/store';
import { engine } from '@/player/engine';
import { useLibrary } from '@/state/library';
import { isPlayable } from '@/lib/validate';
import { Cover } from './Cover';
import { Eq } from './Eq';

export function useStationState(station: Station) {
  const current = usePlayer((s) => s.station?.id === station.id);
  const status = usePlayer((s) => (s.station?.id === station.id ? s.status : 'idle'));
  return { current, status };
}

export function playStation(station: Station) {
  useLibrary.getState().pushRecent(station.id);
  engine().toggle(station);
}

export function PlayButton({ station, size = 'md' }: { station: Station; size?: 'md' | 'lg' }) {
  const { status } = useStationState(station);
  const busy = status === 'connecting' || status === 'loading';
  const playing = status === 'playing';
  const dim = size === 'lg' ? 'h-16 w-16' : 'h-11 w-11';
  const icon = size === 'lg' ? 28 : 20;
  const label = playing || busy ? `Pausar ${station.name}` : `Escuchar ${station.name}`;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        playStation(station);
      }}
      className={`${dim} grid shrink-0 place-items-center rounded-full bg-accent text-ink shadow-lg shadow-accent/30 transition hover:scale-105 active:scale-95`}
      aria-label={label}
      title={label}
    >
      {busy ? <Loader2 size={icon} className="animate-spin" /> : playing ? <Pause size={icon} fill="currentColor" /> : <Play size={icon} fill="currentColor" className="translate-x-[1px]" />}
    </button>
  );
}

export function FavoriteButton({ station, className = '' }: { station: Station; className?: string }) {
  const fav = useLibrary((s) => s.favorites.includes(station.id));
  const toggle = useLibrary((s) => s.toggleFavorite);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle(station.id);
      }}
      className={`grid h-10 w-10 place-items-center rounded-full transition hover:bg-white/10 ${fav ? 'text-accent' : 'text-muted'} ${className}`}
      aria-pressed={fav}
      aria-label={fav ? `Quitar ${station.name} de favoritos` : `Añadir ${station.name} a favoritos`}
    >
      <Heart size={20} fill={fav ? 'currentColor' : 'none'} />
    </button>
  );
}

export function StationCard({ station, category, layout = 'row' }: { station: Station; category?: Category; layout?: 'row' | 'tile' }) {
  const { current, status } = useStationState(station);
  const playable = isPlayable(station);
  const live = current && status === 'playing';

  if (layout === 'tile') {
    return (
      <article className="fade-in group w-44 shrink-0 sm:w-52">
        <div className="relative">
          <Cover category={category} image={station.image} label={station.name} className="aspect-square w-full" />
          <div className="absolute bottom-2 right-2">{playable && <PlayButton station={station} />}</div>
          {live && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-2 py-1 text-[11px] font-semibold text-accent-2 backdrop-blur">
              <Eq /> Sonando
            </span>
          )}
        </div>
        <h3 className="mt-2 truncate font-display text-[15px] font-semibold">{station.name}</h3>
        <p className="truncate text-xs text-muted">{category?.name}</p>
      </article>
    );
  }

  return (
    <article className={`fade-in flex items-center gap-3 rounded-2xl border p-3 transition ${current ? 'border-accent/50 bg-accent/10' : 'border-line bg-surface hover:bg-surface-2'}`}>
      <Cover category={category} image={station.image} label={station.name} className="h-16 w-16 shrink-0 text-xs" />
      <div className="min-w-0 flex-1">
        <h3 className="flex items-center gap-2 truncate font-display text-base font-semibold">
          {live && <Eq className="text-accent-2" />}
          <span className="truncate">{station.name}</span>
        </h3>
        <p className="line-clamp-2 text-xs leading-snug text-muted">{station.description}</p>
        <p className="mt-1 text-[11px] font-medium text-accent-3">{station.license.name}</p>
      </div>
      <FavoriteButton station={station} />
      {playable ? (
        <PlayButton station={station} />
      ) : (
        <span className="grid h-11 w-11 place-items-center rounded-full bg-white/5 text-muted" title="Fuente no disponible">
          <AlertTriangle size={18} />
        </span>
      )}
    </article>
  );
}
