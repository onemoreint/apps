/** Modelo de datos del catálogo. Todo lo que se muestra al oyente sale de aquí. */

export interface Category {
  id: string;
  name: string;
  description: string;
  /** Emoji o símbolo corto para la portada generada. */
  glyph: string;
  /** Dos colores para el degradado de la portada. */
  colors: [string, string];
  /** URL opcional de una imagen de portada propia (https). */
  image?: string;
  order: number;
  active: boolean;
}

export type StationKind =
  /** Stream en directo (Icecast/Shoutcast MP3/AAC, o HLS .m3u8). */
  | 'stream'
  /** Programa continuo armado con pistas de licencia libre alojadas en Internet Archive. */
  | 'archive';

export type AudioFormat = 'mp3' | 'aac' | 'ogg' | 'hls' | 'auto';

export interface License {
  /** Nombre corto: "Dominio público", "CC BY 4.0", "Licencia SAYCO-ACINPRO", etc. */
  name: string;
  url?: string;
  /** Texto de atribución que se muestra al oyente (obligatorio en CC BY). */
  attribution?: string;
  /** Qué permiso respalda la difusión pública en esta app. */
  notes: string;
}

export interface ArchiveSource {
  /** Identificador del ítem en archive.org. */
  identifier: string;
  /** Carpetas (primer o segundo nivel) a incluir; vacío = todo el ítem. */
  folders: string[];
  /** Artista por defecto si el archivo no lo indica. */
  defaultArtist?: string;
}

export interface NowPlayingSource {
  /** 'icecast' = status-json.xsl de Icecast 2.4+; 'azuracast' = /api/nowplaying/<estación>. */
  type: 'icecast' | 'azuracast';
  url: string;
}

export interface Station {
  id: string;
  name: string;
  categoryId: string;
  description: string;
  kind: StationKind;
  /** Para kind = 'stream'. */
  streamUrl?: string;
  format: AudioFormat;
  /** Para kind = 'archive'. */
  archive?: ArchiveSource;
  nowPlaying?: NowPlayingSource;
  image?: string;
  active: boolean;
  popular?: boolean;
  license: License;
  /** Página pública de la fuente (para enlazar). */
  website?: string;
  /** Fecha en que se comprobó que la fuente funciona y está autorizada. */
  verifiedAt?: string;
}

export interface SpotifyPlaylistRef {
  id: string;
  /** URL pública de la playlist en open.spotify.com */
  url: string;
  categoryId: string;
  /** Datos de oEmbed (se rellenan al registrar, se pueden refrescar). */
  title?: string;
  thumbnail?: string;
}

export interface Catalog {
  version: number;
  updatedAt: string;
  categories: Category[];
  stations: Station[];
  playlists: SpotifyPlaylistRef[];
}

/** Una pista de un programa 'archive'. */
export interface Track {
  url: string;
  title: string;
  artist: string;
  album?: string;
  /** Duración en segundos. */
  duration: number;
}

export interface NowPlaying {
  title: string;
  artist?: string;
  album?: string;
  artwork?: string;
  /** Página para ver la obra/licencia. */
  link?: string;
}
