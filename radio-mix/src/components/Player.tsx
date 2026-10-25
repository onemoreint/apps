import { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, ExternalLink, Loader2, Pause, Play, RotateCw, Volume1, Volume2, VolumeX, X } from 'lucide-react';
import { usePlayer, type PlayerStatus } from '@/player/store';
import { engine } from '@/player/engine';
import { useCatalog } from '@/state/catalog';
import { Cover } from './Cover';
import { Eq } from './Eq';
import { FavoriteButton } from './StationCard';

export const statusText: Record<PlayerStatus, string> = {
  idle: 'Listo',
  connecting: 'Conectando…',
  loading: 'Cargando audio…',
  playing: 'En vivo',
  paused: 'En pausa',
  error: 'Sin señal',
};

const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function useCategoryOf(categoryId?: string) {
  const catalog = useCatalog();
  return catalog.categories.find((c) => c.id === categoryId);
}

function MainButton({ big = false }: { big?: boolean }) {
  const status = usePlayer((s) => s.status);
  const busy = status === 'connecting' || status === 'loading';
  const active = busy || status === 'playing';
  const dim = big ? 'h-20 w-20' : 'h-12 w-12';
  const icon = big ? 34 : 22;
  if (status === 'error') {
    return (
      <button type="button" onClick={() => engine().resume()} className={`${dim} grid place-items-center rounded-full bg-white text-ink transition active:scale-95`} aria-label="Volver a conectar">
        <RotateCw size={icon - 4} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => engine().toggle()}
      className={`${dim} grid place-items-center rounded-full bg-accent text-ink shadow-lg shadow-accent/30 transition hover:scale-105 active:scale-95`}
      aria-label={active ? 'Pausar' : 'Reproducir'}
    >
      {busy ? <Loader2 size={icon} className="animate-spin" /> : active ? <Pause size={icon} fill="currentColor" /> : <Play size={icon} fill="currentColor" className="translate-x-[2px]" />}
    </button>
  );
}

function StatusPill() {
  const status = usePlayer((s) => s.status);
  const color = status === 'playing' ? 'text-accent-3' : status === 'error' ? 'text-accent' : 'text-muted';
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${color}`} role="status" aria-live="polite">
      {status === 'playing' ? <Eq /> : status === 'error' ? <AlertTriangle size={12} /> : status === 'paused' || status === 'idle' ? null : <Loader2 size={12} className="animate-spin" />}
      {statusText[status]}
    </span>
  );
}

function Volume() {
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const Icon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  if (isIOS) return <p className="text-center text-xs text-muted">En iPhone y iPad el volumen se controla con los botones del dispositivo.</p>;
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => engine().toggleMute()} className="grid h-9 w-9 place-items-center rounded-full text-soft hover:bg-white/10" aria-label={muted ? 'Activar sonido' : 'Silenciar'}>
        <Icon size={20} />
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={muted ? 0 : volume}
        onChange={(e) => engine().setVolume(Number(e.target.value))}
        className="vol w-full"
        style={{ ['--val' as string]: `${(muted ? 0 : volume) * 100}%` }}
        aria-label="Volumen"
      />
    </div>
  );
}

export function MiniPlayer() {
  const station = usePlayer((s) => s.station);
  const np = usePlayer((s) => s.nowPlaying);
  const status = usePlayer((s) => s.status);
  const error = usePlayer((s) => s.error);
  const setExpanded = usePlayer((s) => s.setExpanded);
  const category = useCategoryOf(station?.categoryId);
  if (!station) return null;
  return (
    <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 px-2 md:bottom-3 md:left-64 md:px-6">
      <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-line bg-surface-2/95 p-2 pr-3 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <button type="button" onClick={() => setExpanded(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label="Abrir reproductor ampliado">
          <Cover category={category} image={np?.artwork ?? station.image} label={station.name} className="h-12 w-12 shrink-0 text-[10px]" />
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-semibold">{station.name}</p>
            {status === 'error' ? (
              <p className="truncate text-xs text-accent">{error}</p>
            ) : np?.title ? (
              <p className="truncate text-xs text-soft">
                {np.title}
                {np.artist ? <span className="text-muted"> · {np.artist}</span> : null}
              </p>
            ) : (
              <StatusPill />
            )}
          </div>
        </button>
        <MainButton />
        <button type="button" onClick={() => engine().stop()} className="hidden h-9 w-9 place-items-center rounded-full text-muted hover:bg-white/10 sm:grid" aria-label="Detener y cerrar el reproductor">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

export function ExpandedPlayer() {
  const expanded = usePlayer((s) => s.expanded);
  const setExpanded = usePlayer((s) => s.setExpanded);
  const station = usePlayer((s) => s.station);
  const np = usePlayer((s) => s.nowPlaying);
  const status = usePlayer((s) => s.status);
  const error = usePlayer((s) => s.error);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const category = useCategoryOf(station?.categoryId);
  const [, force] = useState(0);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(false);
    window.addEventListener('keydown', onKey);
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearInterval(t);
    };
  }, [expanded, setExpanded]);

  if (!expanded || !station) return null;
  const isProgram = station.kind === 'archive';
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center" onClick={() => setExpanded(false)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Reproductor: ${station.name}`}
        onClick={(e) => e.stopPropagation()}
        className="sheet-in ambient pt-safe pb-safe relative flex max-h-[100dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl border border-line bg-ink md:rounded-3xl"
      >
        <header className="flex items-center justify-between px-4 pt-3">
          <button type="button" onClick={() => setExpanded(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Cerrar reproductor ampliado">
            <ChevronDown size={24} />
          </button>
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">{category?.name}</span>
          <FavoriteButton station={station} />
        </header>

        <div className="px-8 pt-4">
          <Cover
            category={category}
            image={np?.artwork ?? station.image}
            label={station.name}
            vinyl
            className={`mx-auto aspect-square w-full max-w-[300px] shadow-2xl shadow-black/60 ${status === 'playing' ? 'spin-slow' : ''}`}
          />
        </div>

        <div className="px-6 pt-6 text-center">
          <StatusPill />
          <h2 className="mt-2 font-display text-2xl font-bold leading-tight">{np?.title ?? station.name}</h2>
          <p className="mt-1 text-sm text-soft">{np?.title ? (np.artist ?? station.name) : station.description}</p>
          {np?.album && <p className="text-xs text-muted">{np.album}</p>}
          {!np?.title && station.kind === 'stream' && !station.nowPlaying && status === 'playing' && (
            <p className="mt-2 text-xs text-muted">Esta emisora no publica el nombre de la canción.</p>
          )}
        </div>

        {isProgram && duration > 0 && status !== 'error' && (
          <div className="px-6 pt-5" aria-label="Avance de la pista actual">
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-accent-2 transition-[width] duration-1000" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted">
              <span>{fmt(position)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="mx-6 mt-5 rounded-2xl border border-accent/40 bg-accent/10 p-3 text-sm text-soft" role="alert">
            <p className="flex items-start gap-2">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-accent" /> {error}
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-6 px-6 pt-6">
          <MainButton big />
        </div>

        <div className="px-8 pt-6">
          <Volume />
        </div>

        <footer className="mt-6 border-t border-line px-6 py-4 text-xs text-muted">
          <p>
            <span className="font-semibold text-soft">Licencia:</span> {station.license.name}
            {station.license.attribution ? ` — ${station.license.attribution}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {station.license.url && (
              <a href={station.license.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-3 hover:underline">
                Ver licencia <ExternalLink size={12} />
              </a>
            )}
            {station.website && (
              <a href={station.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-3 hover:underline">
                Ver la fuente <ExternalLink size={12} />
              </a>
            )}
          </div>
          {isProgram && <p className="mt-2">Programación continua: todos los oyentes escuchan la misma pista a la misma hora. Al pausar y reanudar vuelves al momento en vivo.</p>}
        </footer>
      </section>
    </div>
  );
}
