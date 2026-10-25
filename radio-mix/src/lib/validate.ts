import type { AudioFormat, Catalog, Category, Station, SpotifyPlaylistRef } from './types';

/** Hosts que nunca se aceptan como fuente (red local, metadatos de nube…). */
const BLOCKED_HOST = /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i;

export type UrlCheck = { ok: true; url: URL } | { ok: false; error: string };

/**
 * Valida una URL de audio o imagen: solo https (los navegadores bloquean audio http
 * dentro de una página https), sin credenciales embebidas y sin hosts locales.
 */
export function checkHttpsUrl(raw: string): UrlCheck {
  const value = raw.trim();
  if (!value) return { ok: false, error: 'La URL está vacía.' };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: 'No es una URL válida.' };
  }
  if (url.protocol !== 'https:') return { ok: false, error: 'Debe empezar por https:// (el navegador bloquea audio http en una app segura).' };
  if (url.username || url.password) return { ok: false, error: 'La URL no puede llevar usuario o contraseña.' };
  if (BLOCKED_HOST.test(url.hostname)) return { ok: false, error: 'No se permiten direcciones locales o privadas.' };
  if (!url.hostname.includes('.')) return { ok: false, error: 'El dominio no es válido.' };
  return { ok: true, url };
}

/** Deduce el formato a partir de la URL cuando la estación indica 'auto'. */
export function detectFormat(url: string, declared: AudioFormat = 'auto'): Exclude<AudioFormat, 'auto'> {
  if (declared !== 'auto') return declared;
  const path = url.split('?')[0]!.toLowerCase();
  if (path.endsWith('.m3u8')) return 'hls';
  if (path.endsWith('.aac') || path.endsWith('.m4a')) return 'aac';
  if (path.endsWith('.ogg') || path.endsWith('.opus')) return 'ogg';
  return 'mp3';
}

const SPOTIFY_PLAYLIST = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?playlist\/([A-Za-z0-9]{22})(?:[/?#].*)?$/;

/** Extrae el ID de una playlist de un enlace de Spotify (o URI spotify:playlist:…). */
export function parseSpotifyPlaylist(raw: string): string | null {
  const v = raw.trim();
  const uri = /^spotify:playlist:([A-Za-z0-9]{22})$/.exec(v);
  if (uri) return uri[1]!;
  const m = SPOTIFY_PLAYLIST.exec(v);
  return m ? m[1]! : null;
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

/** Problemas de una estación. Una estación con problemas no se puede reproducir. */
export function stationIssues(s: Station): string[] {
  const issues: string[] = [];
  if (!s.name.trim()) issues.push('Falta el nombre.');
  if (!s.license?.name?.trim()) issues.push('Falta indicar la licencia o el permiso de difusión.');
  if (s.kind === 'stream') {
    const c = checkHttpsUrl(s.streamUrl ?? '');
    if (!c.ok) issues.push(`URL del stream: ${c.error}`);
  } else if (s.kind === 'archive') {
    if (!s.archive || !/^[A-Za-z0-9._-]+$/.test(s.archive.identifier)) issues.push('Identificador de Internet Archive no válido.');
  }
  if (s.image) {
    const c = checkHttpsUrl(s.image);
    if (!c.ok) issues.push(`Imagen: ${c.error}`);
  }
  if (s.nowPlaying) {
    const c = checkHttpsUrl(s.nowPlaying.url);
    if (!c.ok) issues.push(`Metadatos: ${c.error}`);
  }
  return issues;
}

export function isPlayable(s: Station): boolean {
  return s.active && stationIssues(s).length === 0;
}

function isCategory(c: unknown): c is Category {
  const x = c as Category;
  return !!x && typeof x.id === 'string' && typeof x.name === 'string' && Array.isArray(x.colors);
}

function isStation(s: unknown): s is Station {
  const x = s as Station;
  return !!x && typeof x.id === 'string' && typeof x.name === 'string' && (x.kind === 'stream' || x.kind === 'archive') && !!x.license;
}

function isPlaylist(p: unknown): p is SpotifyPlaylistRef {
  const x = p as SpotifyPlaylistRef;
  return !!x && typeof x.id === 'string' && /^[A-Za-z0-9]{22}$/.test(x.id) && typeof x.categoryId === 'string';
}

/** Valida un catálogo importado (JSON del panel). Lanza un error legible si no sirve. */
export function parseCatalog(data: unknown): Catalog {
  const c = data as Catalog;
  if (!c || typeof c !== 'object') throw new Error('El archivo no contiene un catálogo.');
  if (!Array.isArray(c.categories) || !c.categories.every(isCategory)) throw new Error('Las categorías no tienen el formato esperado.');
  if (!Array.isArray(c.stations) || !c.stations.every(isStation)) throw new Error('Las emisoras no tienen el formato esperado.');
  const playlists = Array.isArray(c.playlists) ? c.playlists.filter(isPlaylist) : [];
  const ids = new Set<string>();
  for (const s of c.stations) {
    if (ids.has(s.id)) throw new Error(`ID de emisora repetido: ${s.id}`);
    ids.add(s.id);
  }
  return {
    version: typeof c.version === 'number' ? c.version : 1,
    updatedAt: typeof c.updatedAt === 'string' ? c.updatedAt : new Date().toISOString().slice(0, 10),
    categories: c.categories,
    stations: c.stations,
    playlists,
  };
}
