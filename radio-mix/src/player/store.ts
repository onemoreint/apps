import { create } from 'zustand';
import type { NowPlaying, Station } from '@/lib/types';
import { readJSON, writeJSON } from '@/lib/storage';

export type PlayerStatus = 'idle' | 'connecting' | 'loading' | 'playing' | 'paused' | 'error';

export interface PlayerState {
  station: Station | null;
  status: PlayerStatus;
  error: string | null;
  /** Solo datos reales: de la pista del programa o de los metadatos del servidor. Nunca inventados. */
  nowPlaying: NowPlaying | null;
  /** Para programas: posición y duración de la pista actual (segundos). */
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
}

export const usePlayer = create<PlayerState>((set) => ({
  station: null,
  status: 'idle',
  error: null,
  nowPlaying: null,
  position: 0,
  duration: 0,
  volume: readJSON<number>('volume', 0.9),
  muted: false,
  expanded: false,
  setExpanded: (expanded) => set({ expanded }),
}));

usePlayer.subscribe((s, prev) => {
  if (s.volume !== prev.volume) writeJSON('volume', s.volume);
});
