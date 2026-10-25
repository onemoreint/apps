import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Station, Track } from '@/lib/types';

const tracks: Track[] = [
  { url: 'https://archive.org/download/X/a.mp3', title: 'Pista A', artist: 'Artista A', album: 'Álbum', duration: 100 },
  { url: 'https://archive.org/download/X/b.mp3', title: 'Pista B', artist: 'Artista B', album: 'Álbum', duration: 100 },
];

vi.mock('@/lib/archive', async (orig) => {
  const real = await orig<typeof import('@/lib/archive')>();
  return { ...real, loadProgram: vi.fn(async () => tracks) };
});

const { RadioEngine } = await import('./engine');
const { usePlayer } = await import('./store');
const archive = await import('@/lib/archive');

/** Elemento de audio simulado: registra lo que la app le pide y permite disparar eventos. */
class FakeAudio extends EventTarget {
  src = '';
  currentTime = 0;
  duration = NaN;
  volume = 1;
  muted = false;
  paused = true;
  preload = '';
  error: { code: number } | null = null;
  playCalls: string[] = [];
  play = vi.fn(async () => {
    this.playCalls.push(this.src);
    this.paused = false;
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
  load = vi.fn();
  canPlayType = vi.fn(() => '');
  removeAttribute(name: string) {
    if (name === 'src') this.src = '';
  }
  fire(type: string) {
    this.dispatchEvent(new Event(type));
  }
}

const program: Station = {
  id: 'prog',
  name: 'Programa',
  categoryId: 'instrumental',
  description: '',
  kind: 'archive',
  format: 'mp3',
  archive: { identifier: 'X', folders: [] },
  active: true,
  license: { name: 'Dominio público', notes: 'ok' },
};

const stream: Station = {
  id: 'live',
  name: 'Directo',
  categoryId: 'salsa',
  description: '',
  kind: 'stream',
  streamUrl: 'https://radio.example.com/live.mp3',
  format: 'mp3',
  active: true,
  license: { name: 'Licencia OSA', notes: 'ok' },
};

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('RadioEngine', () => {
  let audio: FakeAudio;
  let eng: InstanceType<typeof RadioEngine>;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(archive.PROGRAM_EPOCH_MS + 130_000); // pista B, segundo 30
    audio = new FakeAudio();
    usePlayer.setState({ station: null, status: 'idle', error: null, nowPlaying: null });
    eng = new RadioEngine(() => audio as unknown as HTMLAudioElement);
  });
  afterEach(() => vi.useRealTimers());

  it('desbloquea el audio dentro del toque y luego reproduce la pista en vivo con su segundo exacto', async () => {
    const p = eng.play(program);
    expect(audio.playCalls[0]).toMatch(/^data:audio\/wav/); // gesto del usuario
    expect(usePlayer.getState().status).toBe('connecting');
    await p;
    expect(audio.src).toBe(tracks[1]!.url);
    expect(usePlayer.getState().nowPlaying).toMatchObject({ title: 'Pista B', artist: 'Artista B' });
    audio.duration = 100;
    audio.fire('loadedmetadata');
    expect(audio.currentTime).toBe(30);
    audio.fire('playing');
    expect(usePlayer.getState().status).toBe('playing');
  });

  it('al terminar una pista pasa a la siguiente (y vuelve a la primera al final)', async () => {
    await eng.play(program);
    audio.fire('playing');
    audio.fire('ended');
    await flush();
    expect(audio.src).toBe(tracks[0]!.url);
    expect(usePlayer.getState().nowPlaying?.title).toBe('Pista A');
  });

  it('en un stream sin metadatos no inventa canción', async () => {
    await eng.play(stream);
    expect(audio.src).toMatch(/^https:\/\/radio\.example\.com\/live\.mp3\?_rm=/);
    audio.fire('playing');
    expect(usePlayer.getState().nowPlaying).toBeNull();
    expect(usePlayer.getState().station?.id).toBe('live');
  });

  it('si la fuente falla reintenta una vez y después muestra un error claro', async () => {
    await eng.play(stream);
    audio.error = { code: 4 };
    audio.fire('error');
    expect(usePlayer.getState().status).toBe('connecting');
    await vi.advanceTimersByTimeAsync(3000);
    audio.error = { code: 4 };
    audio.fire('error');
    expect(usePlayer.getState().status).toBe('error');
    expect(usePlayer.getState().error).toMatch(/no está disponible/);
  });

  it('declara la fuente caída si no llegan datos en 20 s', async () => {
    await eng.play(stream);
    await vi.advanceTimersByTimeAsync(21_000);
    expect(usePlayer.getState().status).toBe('error');
    expect(usePlayer.getState().error).toMatch(/no responde/);
  });

  it('no reproduce emisoras sin licencia ni desactivadas', async () => {
    await eng.play({ ...stream, license: { name: '', notes: '' } });
    expect(usePlayer.getState().status).toBe('error');
    expect(audio.playCalls.filter((s) => s.startsWith('https'))).toHaveLength(0);
  });

  it('pausa, reanuda en vivo y cambia de emisora usando un único elemento de audio', async () => {
    await eng.play(program);
    audio.fire('playing');
    eng.pause();
    expect(usePlayer.getState().status).toBe('paused');
    expect(audio.pause).toHaveBeenCalled();
    eng.toggle(stream);
    await flush();
    expect(usePlayer.getState().station?.id).toBe('live');
    expect(audio.src).toContain('radio.example.com');
  });

  it('el volumen se aplica y se recuerda', () => {
    eng.setVolume(0.3);
    expect(audio.volume).toBe(0.3);
    expect(usePlayer.getState().volume).toBe(0.3);
    expect(localStorage.getItem('radiomix:volume')).toBe('0.3');
  });

  it('si el navegador bloquea la reproducción pide un toque en vez de fallar en silencio', async () => {
    audio.play = vi.fn(async () => {
      if (!audio.src.startsWith('data:')) throw new DOMException('x', 'NotAllowedError');
    });
    await eng.play(stream);
    expect(usePlayer.getState().status).toBe('paused');
    expect(usePlayer.getState().error).toMatch(/pulsa reproducir/);
  });
});
