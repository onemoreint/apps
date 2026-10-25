/**
 * Integración con Spotify limitada a lo que permiten sus condiciones:
 *  - oEmbed y reproductor embebido oficial (open.spotify.com/embed) para que cualquiera vea y escuche
 *    las playlists dentro del reproductor de Spotify (sin descargar ni retransmitir audio).
 *  - OAuth 2.0 con PKCE (sin secreto en el cliente) para que el DUEÑO importe sus playlists.
 * Nunca se usa Spotify como fuente de la radio.
 */
import { readJSON, writeJSON } from '@/lib/storage';

export const SPOTIFY_SCOPES = ['playlist-read-private', 'playlist-read-collaborative'];
const AUTH_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API = 'https://api.spotify.com/v1';

export interface OEmbed {
  title: string;
  thumbnail_url?: string;
}

export function playlistUrl(id: string): string {
  return `https://open.spotify.com/playlist/${id}`;
}

export function embedUrl(id: string): string {
  return `https://open.spotify.com/embed/playlist/${id}?utm_source=radio-mix&theme=0`;
}

/** Datos públicos de una playlist (título y portada) mediante oEmbed: no requiere cuenta. */
export async function fetchOEmbed(id: string, signal?: AbortSignal): Promise<OEmbed> {
  const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(playlistUrl(id))}`, { signal });
  if (!res.ok) throw new Error(res.status === 404 ? 'La playlist no existe o es privada.' : `Spotify respondió ${res.status}.`);
  const j = (await res.json()) as OEmbed;
  return { title: j.title, thumbnail_url: j.thumbnail_url };
}

/** Client ID (público por diseño en PKCE). Se toma de la variable de entorno o del panel. */
export function getClientId(): string {
  return (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() || readJSON<string>('spotifyClientId', '');
}

export function setClientId(id: string) {
  writeJSON('spotifyClientId', id.trim());
}

/** Debe registrarse EXACTAMENTE igual en el panel de desarrolladores de Spotify. */
export function redirectUri(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString();
}

function base64url(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomVerifier(len = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const rnd = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(rnd, (b) => chars[b % chars.length]).join('');
}

export async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

interface TokenSet {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

const TOKEN_KEY = 'radiomix:spotify-token';

function saveToken(t: TokenSet) {
  // sessionStorage: el token desaparece al cerrar la pestaña. Nunca se guarda en el código ni en el servidor.
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(t));
}

function loadToken(): TokenSet | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as TokenSet) : null;
  } catch {
    return null;
  }
}

export function isConnected(): boolean {
  return loadToken() !== null;
}

export function disconnect() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function startLogin(): Promise<void> {
  const clientId = getClientId();
  if (!clientId) throw new Error('Falta configurar el Client ID de Spotify en el panel.');
  const verifier = randomVerifier();
  const state = randomVerifier(24);
  sessionStorage.setItem('radiomix:pkce', JSON.stringify({ verifier, state }));
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: await challengeFor(verifier),
    scope: SPOTIFY_SCOPES.join(' '),
    state,
  });
  window.location.assign(`${AUTH_URL}?${params.toString()}`);
}

/**
 * Si la URL actual es la vuelta de Spotify (?code=…&state=…), canjea el código por un token.
 * Devuelve true si había una vuelta de OAuth que procesar.
 */
export async function handleRedirect(): Promise<{ handled: boolean; error?: string }> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const err = url.searchParams.get('error');
  const state = url.searchParams.get('state');
  if (!code && !err) return { handled: false };
  const clean = () => window.history.replaceState(null, '', `${url.pathname}#/spotify`);
  const pkce = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('radiomix:pkce') ?? 'null') as { verifier: string; state: string } | null;
    } catch {
      return null;
    }
  })();
  sessionStorage.removeItem('radiomix:pkce');
  if (err) {
    clean();
    return { handled: true, error: err === 'access_denied' ? 'Cancelaste la conexión con Spotify.' : `Spotify devolvió: ${err}` };
  }
  if (!pkce || pkce.state !== state) {
    clean();
    return { handled: true, error: 'La respuesta de Spotify no coincide con esta sesión. Vuelve a intentarlo.' };
  }
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: getClientId(),
      grant_type: 'authorization_code',
      code: code!,
      redirect_uri: redirectUri(),
      code_verifier: pkce.verifier,
    }),
  });
  clean();
  if (!res.ok) return { handled: true, error: `No se pudo completar la conexión (${res.status}).` };
  const j = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
  saveToken({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in - 60) * 1000 });
  return { handled: true };
}

async function accessToken(): Promise<string> {
  const t = loadToken();
  if (!t) throw new Error('No hay una cuenta de Spotify conectada.');
  if (Date.now() < t.expires_at) return t.access_token;
  if (!t.refresh_token) {
    disconnect();
    throw new Error('La sesión de Spotify caducó. Vuelve a conectar.');
  }
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: getClientId(), grant_type: 'refresh_token', refresh_token: t.refresh_token }),
  });
  if (!res.ok) {
    disconnect();
    throw new Error('La sesión de Spotify caducó. Vuelve a conectar.');
  }
  const j = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
  saveToken({ access_token: j.access_token, refresh_token: j.refresh_token ?? t.refresh_token, expires_at: Date.now() + (j.expires_in - 60) * 1000 });
  return j.access_token;
}

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${await accessToken()}` } });
  if (res.status === 401) {
    disconnect();
    throw new Error('Spotify rechazó la sesión. Vuelve a conectar.');
  }
  if (res.status === 403) throw new Error('Spotify denegó el acceso. En modo desarrollo, tu cuenta debe estar en la lista de usuarios de la app y el dueño debe tener Premium.');
  if (res.status === 429) throw new Error('Spotify limitó las consultas por ahora. Intenta de nuevo en unos minutos.');
  if (!res.ok) throw new Error(`Spotify respondió ${res.status}.`);
  return (await res.json()) as T;
}

export interface MyPlaylist {
  id: string;
  name: string;
  image?: string;
  owner: string;
  total?: number;
  isPublic: boolean | null;
}

/** Playlists del usuario conectado (GET /me/playlists, paginado). */
export async function myPlaylists(): Promise<MyPlaylist[]> {
  type Page = {
    items: Array<{ id: string; name: string; images?: Array<{ url: string }> | null; owner?: { display_name?: string }; public: boolean | null; items?: { total?: number }; tracks?: { total?: number } }>;
    next: string | null;
  };
  const out: MyPlaylist[] = [];
  let path: string | null = '/me/playlists?limit=50';
  for (let i = 0; path && i < 10; i++) {
    const page: Page = await api<Page>(path);
    for (const p of page.items) {
      if (!p) continue;
      out.push({
        id: p.id,
        name: p.name,
        image: p.images?.[0]?.url,
        owner: p.owner?.display_name ?? '',
        total: p.items?.total ?? p.tracks?.total,
        isPublic: p.public,
      });
    }
    path = page.next ? page.next.replace(API, '') : null;
  }
  return out;
}

export interface PlaylistItem {
  name: string;
  artists: string;
  url?: string;
}

/**
 * Canciones de una playlist (GET /playlists/{id}/items). Desde febrero de 2026 Spotify solo devuelve
 * el contenido de playlists propias o colaborativas; para el resto se usa el reproductor embebido.
 */
export async function playlistItems(id: string): Promise<PlaylistItem[]> {
  type Item = { item?: { name?: string; artists?: Array<{ name: string }>; external_urls?: { spotify?: string } } | null; track?: Item['item'] };
  const page = await api<{ items: Item[] }>(`/playlists/${id}/items?limit=50`);
  return page.items
    .map((i) => i.item ?? i.track)
    .filter((t): t is NonNullable<Item['item']> => !!t && !!t.name)
    .map((t) => ({ name: t.name!, artists: (t.artists ?? []).map((a) => a.name).join(', '), url: t.external_urls?.spotify }));
}
