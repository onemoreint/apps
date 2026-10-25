import { create } from 'zustand';
import { readJSON, writeJSON } from '@/lib/storage';
import type { SpotifyPlaylistRef } from '@/lib/types';

/** Favoritos, recientes y playlists personales del oyente: se guardan solo en su dispositivo. */
interface LibraryState {
  favorites: string[];
  recents: string[];
  myPlaylists: SpotifyPlaylistRef[];
  toggleFavorite: (stationId: string) => void;
  isFavorite: (stationId: string) => boolean;
  pushRecent: (stationId: string) => void;
  addMyPlaylist: (p: SpotifyPlaylistRef) => void;
  removeMyPlaylist: (id: string) => void;
}

export const useLibrary = create<LibraryState>((set, get) => ({
  favorites: readJSON<string[]>('favorites', []),
  recents: readJSON<string[]>('recents', []),
  myPlaylists: readJSON<SpotifyPlaylistRef[]>('myPlaylists', []),
  toggleFavorite: (id) => {
    const cur = get().favorites;
    const favorites = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur];
    writeJSON('favorites', favorites);
    set({ favorites });
  },
  isFavorite: (id) => get().favorites.includes(id),
  pushRecent: (id) => {
    const recents = [id, ...get().recents.filter((x) => x !== id)].slice(0, 12);
    writeJSON('recents', recents);
    set({ recents });
  },
  addMyPlaylist: (p) => {
    const myPlaylists = [p, ...get().myPlaylists.filter((x) => x.id !== p.id)];
    writeJSON('myPlaylists', myPlaylists);
    set({ myPlaylists });
  },
  removeMyPlaylist: (id) => {
    const myPlaylists = get().myPlaylists.filter((x) => x.id !== id);
    writeJSON('myPlaylists', myPlaylists);
    set({ myPlaylists });
  },
}));
