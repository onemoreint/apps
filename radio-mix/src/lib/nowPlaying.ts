import type { NowPlaying, NowPlayingSource } from './types';

/** Interpreta la respuesta de status-json.xsl de Icecast 2.4+. */
export function parseIcecast(json: unknown, streamUrl?: string): NowPlaying | null {
  const stats = (json as { icestats?: { source?: unknown } })?.icestats;
  if (!stats?.source) return null;
  const list = (Array.isArray(stats.source) ? stats.source : [stats.source]) as Array<Record<string, string>>;
  const mount = streamUrl ? new URL(streamUrl).pathname : '';
  const src = list.find((s) => mount && (s.listenurl ?? '').endsWith(mount)) ?? list[0];
  if (!src) return null;
  const raw = (src.title ?? src.yp_currently_playing ?? '').trim();
  if (!raw) return null;
  const parts = raw.split(' - ');
  if (parts.length >= 2 && !src.artist) return { artist: parts[0]!.trim(), title: parts.slice(1).join(' - ').trim() };
  return { title: raw, artist: src.artist };
}

/** Interpreta la respuesta de /api/nowplaying/<estación> de AzuraCast. */
export function parseAzuraCast(json: unknown): NowPlaying | null {
  const song = (json as { now_playing?: { song?: Record<string, string> } })?.now_playing?.song;
  if (!song?.title && !song?.text) return null;
  return { title: song.title || song.text!, artist: song.artist || undefined, album: song.album || undefined, artwork: song.art || undefined };
}

export async function fetchNowPlaying(src: NowPlayingSource, streamUrl?: string, signal?: AbortSignal): Promise<NowPlaying | null> {
  const res = await fetch(src.url, { signal, cache: 'no-store' });
  if (!res.ok) return null;
  const json: unknown = await res.json();
  return src.type === 'icecast' ? parseIcecast(json, streamUrl) : parseAzuraCast(json);
}
