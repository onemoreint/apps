import { useEffect, useState } from 'react';
import { ExternalLink, ListMusic, Play, X } from 'lucide-react';
import { create } from 'zustand';
import type { SpotifyPlaylistRef } from '@/lib/types';
import { readJSON, writeJSON } from '@/lib/storage';
import { engine } from '@/player/engine';
import { usePlayer } from '@/player/store';
import { embedUrl, fetchOEmbed, playlistUrl } from './spotify';

type Meta = { title: string; thumbnail?: string; error?: string };

const cache = new Map<string, Meta>(Object.entries(readJSON<Record<string, Meta>>('oembed', {})));

/** Título y portada públicos de una playlist (oEmbed de Spotify), con caché local. */
export function usePlaylistMeta(ref: SpotifyPlaylistRef): Meta | null {
  const initial = ref.title ? { title: ref.title, thumbnail: ref.thumbnail } : cache.get(ref.id) ?? null;
  const [meta, setMeta] = useState<Meta | null>(initial);
  useEffect(() => {
    if (meta && !meta.error) return;
    const ac = new AbortController();
    fetchOEmbed(ref.id, ac.signal)
      .then((m) => {
        const v = { title: m.title, thumbnail: m.thumbnail_url };
        cache.set(ref.id, v);
        writeJSON('oembed', Object.fromEntries(cache));
        setMeta(v);
      })
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setMeta({ title: 'Playlist de Spotify', error: e.message });
      });
    return () => ac.abort();
      }, [ref.id]);
  return meta;
}

const useEmbed = create<{ id: string | null; open: (id: string) => void; close: () => void }>((set) => ({
  id: null,
  open: (id) => set({ id }),
  close: () => set({ id: null }),
}));

export function openSpotifyEmbed(id: string) {
  // Spotify y la radio no suenan a la vez: se pausa la radio antes de abrir el reproductor de Spotify.
  const s = usePlayer.getState().status;
  if (s === 'playing' || s === 'loading' || s === 'connecting') engine().pause();
  useEmbed.getState().open(id);
}

export function PlaylistCard({ playlist, onRemove }: { playlist: SpotifyPlaylistRef; onRemove?: () => void }) {
  const meta = usePlaylistMeta(playlist);
  return (
    <article className="fade-in relative w-40 shrink-0 sm:w-44">
      <button type="button" onClick={() => openSpotifyEmbed(playlist.id)} className="group block w-full text-left" aria-label={`Abrir ${meta?.title ?? 'playlist'} en el reproductor de Spotify`}>
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-surface-2">
          {meta?.thumbnail ? (
            <img src={meta.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted">
              <ListMusic size={36} />
            </div>
          )}
          <span className="absolute bottom-2 right-2 grid h-10 w-10 place-items-center rounded-full bg-[#1ed760] text-black shadow-lg transition group-hover:scale-105">
            <Play size={18} fill="currentColor" />
          </span>
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">{meta?.title ?? 'Cargando…'}</h3>
      </button>
      <p className="text-[11px] text-muted">{meta?.error ?? 'Playlist en Spotify'}</p>
      {onRemove && (
        <button type="button" onClick={onRemove} className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white" aria-label="Quitar playlist">
          <X size={14} />
        </button>
      )}
    </article>
  );
}

/** Reproductor oficial embebido de Spotify. El audio lo sirve y lo controla Spotify. */
export function SpotifyEmbedSheet() {
  const id = useEmbed((s) => s.id);
  const close = useEmbed((s) => s.close);
  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, close]);
  if (!id) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 md:items-center" onClick={close}>
      <section role="dialog" aria-modal="true" aria-label="Playlist de Spotify" onClick={(e) => e.stopPropagation()} className="sheet-in pb-safe w-full max-w-lg rounded-t-3xl border border-line bg-surface p-4 md:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Playlist de Spotify</h2>
          <button type="button" onClick={close} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <iframe
          title="Reproductor de Spotify"
          src={embedUrl(id)}
          width="100%"
          height="452"
          className="rounded-2xl"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          // Aislamiento: el reproductor de Spotify no puede navegar ni tocar la app.
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation allow-storage-access-by-user-activation"
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
        />
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Este reproductor es de Spotify: el audio sale de Spotify, no de la radio. Sin iniciar sesión en Spotify en este navegador solo se oyen fragmentos; con tu cuenta abierta se escuchan
          completas según tu plan.
        </p>
        <a href={playlistUrl(id)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#1ed760] px-4 py-2 text-sm font-bold text-black">
          Abrir en Spotify <ExternalLink size={14} />
        </a>
      </section>
    </div>
  );
}
