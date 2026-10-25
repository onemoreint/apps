import type { ArchiveSource, Track } from './types';
import { readJSON, writeJSON } from './storage';

/** Archivo tal como lo devuelve https://archive.org/metadata/<id>/files */
export interface ArchiveFile {
  name: string;
  format?: string;
  length?: string;
  title?: string;
  creator?: string;
  album?: string;
}

/** Convierte "04:52", "1:02:03" o "292.42" a segundos. */
export function parseLength(raw: string | undefined): number {
  if (!raw) return 0;
  if (raw.includes(':')) {
    const secs = raw.split(':').reduce((acc, part) => acc * 60 + Number(part), 0);
    return Number.isFinite(secs) ? secs : 0;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/** Generador pseudoaleatorio determinista (mulberry32): todos los oyentes obtienen el mismo orden. */
function seeded(seedText: string): () => number {
  let h = 1779033703;
  for (let i = 0; i < seedText.length; i++) h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cleanBase(fileName: string): string {
  return fileName.replace(/\.mp3$/i, '').replace(/_/g, ' ').trim();
}

/**
 * Obtiene título y artista de un archivo. Prioriza los metadatos del propio archivo;
 * si no existen, interpreta el patrón habitual "Artista - 01 - Título".
 */
export function describeFile(f: ArchiveFile, defaultArtist?: string): { title: string; artist: string } {
  const base = cleanBase(f.name.split('/').pop() ?? f.name);
  const source = (f.title ?? base).trim();
  // Patrones habituales: "Artista - 01 - Título", "Compositor - Obra - 01 - Movimiento", "Compositor - Obra".
  const parts = source.split(/\s+-\s+/).filter((p) => !/^\d{1,3}$/.test(p));
  let artist = parts.length > 1 ? parts[0]! : defaultArtist ?? '';
  let title = parts.length > 1 ? parts.slice(1).join(' - ') : parts[0] ?? source;
  if (f.creator && f.creator !== artist) artist = artist ? `${artist} · ${f.creator}` : f.creator;
  title = title.replace(/\s+/g, ' ');
  return { title, artist: artist || 'Artista no indicado' };
}

export function downloadUrl(identifier: string, path: string): string {
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

function inFolders(name: string, folders: string[]): boolean {
  if (folders.length === 0) return true;
  return folders.some((f) => name === f || name.startsWith(`${f}/`));
}

/** Construye la programación: álbumes en orden aleatorio fijo, pistas de cada álbum en su orden. */
export function buildProgram(files: ArchiveFile[], src: ArchiveSource, seed: string): Track[] {
  const mp3 = files.filter((f) => /\.mp3$/i.test(f.name) && inFolders(f.name, src.folders) && parseLength(f.length) > 5);
  const albums = new Map<string, ArchiveFile[]>();
  for (const f of mp3) {
    const folder = f.name.includes('/') ? f.name.slice(0, f.name.lastIndexOf('/')) : '';
    if (!albums.has(folder)) albums.set(folder, []);
    albums.get(folder)!.push(f);
  }
  const keys = [...albums.keys()].sort();
  const rnd = seeded(seed);
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [keys[i], keys[j]] = [keys[j]!, keys[i]!];
  }
  const tracks: Track[] = [];
  for (const k of keys) {
    const list = albums.get(k)!.sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
    for (const f of list) {
      const { title, artist } = describeFile(f, src.defaultArtist);
      tracks.push({
        url: downloadUrl(src.identifier, f.name),
        title,
        artist,
        album: (k.split('/').pop() ?? '').replace(/_/g, ' ') || undefined,
        duration: parseLength(f.length),
      });
    }
  }
  return tracks;
}

/** Inicio común de la programación: todos los oyentes escuchan lo mismo a la misma hora, como en una radio. */
export const PROGRAM_EPOCH_MS = Date.UTC(2026, 0, 1);

export interface ProgramPosition {
  index: number;
  offset: number;
}

/** Calcula qué pista suena "en vivo" y en qué segundo, para un instante dado. */
export function livePosition(tracks: Track[], nowMs: number): ProgramPosition {
  const total = tracks.reduce((s, t) => s + t.duration, 0);
  if (tracks.length === 0 || total <= 0) return { index: 0, offset: 0 };
  let t = (((nowMs - PROGRAM_EPOCH_MS) / 1000) % total + total) % total;
  for (let i = 0; i < tracks.length; i++) {
    const d = tracks[i]!.duration;
    if (t < d) return { index: i, offset: t };
    t -= d;
  }
  return { index: 0, offset: 0 };
}

const CACHE_DAYS = 7;
const memory = new Map<string, Promise<Track[]>>();

/**
 * Descarga la lista de archivos del ítem (API pública de metadatos de Internet Archive,
 * con CORS abierto) y arma la programación. Se guarda en caché local unos días.
 */
export function loadProgram(stationId: string, src: ArchiveSource, fetcher: typeof fetch = fetch): Promise<Track[]> {
  const key = `program:v2:${stationId}:${src.identifier}:${src.folders.join('|')}`;
  const cached = readJSON<{ at: number; tracks: Track[] } | null>(key, null);
  if (cached && Date.now() - cached.at < CACHE_DAYS * 864e5 && cached.tracks.length > 0) {
    return Promise.resolve(cached.tracks);
  }
  if (!memory.has(key)) {
    const p = (async () => {
      const res = await fetcher(`https://archive.org/metadata/${encodeURIComponent(src.identifier)}/files`);
      if (!res.ok) throw new Error(`Internet Archive respondió ${res.status}`);
      const json = (await res.json()) as { result?: ArchiveFile[] };
      const tracks = buildProgram(json.result ?? [], src, stationId);
      if (tracks.length === 0) throw new Error('La fuente no tiene pistas de audio disponibles.');
      writeJSON(key, { at: Date.now(), tracks });
      return tracks;
    })();
    p.catch(() => memory.delete(key));
    memory.set(key, p);
  }
  return memory.get(key)!;
}
