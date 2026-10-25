import type Hls from 'hls.js';
import type { Station, Track } from '@/lib/types';
import { detectFormat, stationIssues } from '@/lib/validate';
import { livePosition, loadProgram } from '@/lib/archive';
import { fetchNowPlaying } from '@/lib/nowPlaying';
import { usePlayer } from './store';
import { silentWavDataUri } from './silence';

/** Tiempo máximo esperando datos antes de declarar la fuente como no disponible. */
const STALL_TIMEOUT_MS = 20_000;
const NOW_PLAYING_EVERY_MS = 20_000;

type AudioFactory = () => HTMLAudioElement;

const mediaErrorText: Record<number, string> = {
  1: 'La reproducción se interrumpió.',
  2: 'Error de red: no se pudo descargar el audio.',
  3: 'El audio llegó dañado y no se puede decodificar.',
  4: 'La fuente no está disponible o su formato no es compatible con este navegador.',
};

/**
 * Motor de audio único para toda la app (un solo elemento <audio>: el reproductor nunca se duplica).
 * La interfaz lee el estado desde el store `usePlayer`; aquí vive la lógica de red y de audio.
 */
export class RadioEngine {
  private audio: HTMLAudioElement;
  private hls: Hls | null = null;
  private program: Track[] = [];
  private index = 0;
  private pendingOffset = 0;
  private session = 0;
  private stallTimer: ReturnType<typeof setTimeout> | null = null;
  private npTimer: ReturnType<typeof setInterval> | null = null;
  private npAbort: AbortController | null = null;
  private retried = false;

  constructor(factory: AudioFactory = () => new Audio()) {
    this.audio = factory();
    this.audio.preload = 'none';
    const st = usePlayer.getState();
    this.audio.volume = st.volume;
    this.bind();
    this.bindMediaSession();
    if (typeof window !== 'undefined') {
      window.addEventListener('offline', () => {
        if (this.isActive()) this.fail('Sin conexión a Internet. Revisa tus datos o el wifi y vuelve a conectar.');
      });
    }
  }

  get element(): HTMLAudioElement {
    return this.audio;
  }

  private isActive(): boolean {
    const s = usePlayer.getState().status;
    return s === 'playing' || s === 'loading' || s === 'connecting';
  }

  private bind() {
    const a = this.audio;
    a.addEventListener('playing', () => {
      if (this.isSilence()) return;
      this.clearStall();
      this.retried = false;
      usePlayer.setState({ status: 'playing', error: null });
      this.updateMediaSession();
    });
    a.addEventListener('waiting', () => {
      if (this.isSilence() || usePlayer.getState().status !== 'playing') return;
      usePlayer.setState({ status: 'loading' });
      this.armStall();
    });
    a.addEventListener('loadedmetadata', () => {
      if (this.isSilence()) return;
      if (this.pendingOffset > 0 && Number.isFinite(a.duration)) {
        try {
          a.currentTime = Math.min(this.pendingOffset, Math.max(0, a.duration - 1));
        } catch {
          /* algunos servidores no admiten saltos: se empieza desde el inicio */
        }
      }
      this.pendingOffset = 0;
    });
    a.addEventListener('timeupdate', () => {
      if (this.isSilence() || usePlayer.getState().station?.kind !== 'archive') return;
      usePlayer.setState({ position: a.currentTime, duration: Number.isFinite(a.duration) ? a.duration : this.program[this.index]?.duration ?? 0 });
    });
    a.addEventListener('ended', () => {
      if (this.isSilence()) return;
      const st = usePlayer.getState().station;
      if (st?.kind === 'archive' && this.program.length > 0) {
        this.loadTrack((this.index + 1) % this.program.length, 0, this.session);
      } else if (st) {
        // Un stream en directo no debería terminar: se intenta reconectar una vez.
        this.reconnectOnce('La transmisión se cortó.');
      }
    });
    a.addEventListener('error', () => {
      if (this.isSilence() || !usePlayer.getState().station) return;
      const code = a.error?.code ?? 4;
      this.reconnectOnce(mediaErrorText[code] ?? mediaErrorText[4]!);
    });
  }

  private isSilence(): boolean {
    return this.audio.src.startsWith('data:audio/wav');
  }

  private armStall() {
    this.clearStall();
    const s = this.session;
    this.stallTimer = setTimeout(() => {
      if (s !== this.session) return;
      const st = usePlayer.getState().status;
      if (st === 'loading' || st === 'connecting') {
        this.fail('La fuente no responde. Puede estar caída o tu conexión es muy lenta.');
      }
    }, STALL_TIMEOUT_MS);
  }

  private clearStall() {
    if (this.stallTimer) clearTimeout(this.stallTimer);
    this.stallTimer = null;
  }

  private reconnectOnce(message: string) {
    const station = usePlayer.getState().station;
    if (!station) return;
    if (!this.retried) {
      this.retried = true;
      usePlayer.setState({ status: 'connecting', error: null });
      const s = this.session;
      setTimeout(() => {
        if (s === this.session) void this.start(station, false);
      }, 2500);
      return;
    }
    this.fail(message);
  }

  private fail(message: string) {
    this.clearStall();
    this.stopNowPlaying();
    this.destroyHls();
    this.audio.pause();
    usePlayer.setState({ status: 'error', error: message });
    this.updateMediaSession();
  }

  /** Debe llamarse desde un toque/clic del usuario (política de reproducción automática). */
  play(station: Station): Promise<void> {
    this.retried = false;
    // Desbloquea el audio dentro del gesto del usuario (necesario en iOS) antes de cualquier espera de red.
    this.audio.src = silentWavDataUri();
    const unlock = this.audio.play();
    if (unlock && typeof unlock.catch === 'function') unlock.catch(() => undefined);
    return this.start(station, true);
  }

  private async start(station: Station, fresh: boolean): Promise<void> {
    const session = ++this.session;
    this.clearStall();
    this.stopNowPlaying();
    this.destroyHls();
    const issues = stationIssues(station);
    if (!station.active || issues.length > 0) {
      usePlayer.setState({ station, status: 'error', error: issues[0] ?? 'Esta emisora está desactivada.', nowPlaying: null });
      return;
    }
    usePlayer.setState({
      station,
      status: 'connecting',
      error: null,
      ...(fresh ? { nowPlaying: null, position: 0, duration: 0 } : {}),
    });
    this.armStall();
    if (station.kind === 'archive' && station.archive) {
      try {
        this.program = await loadProgram(station.id, station.archive);
      } catch (e) {
        if (session === this.session) this.fail(`No se pudo cargar la programación: ${(e as Error).message}`);
        return;
      }
      if (session !== this.session) return;
      const pos = livePosition(this.program, Date.now());
      await this.loadTrack(pos.index, pos.offset, session);
    } else {
      this.program = [];
      usePlayer.setState({ nowPlaying: null });
      await this.attachStream(station, session);
      this.startNowPlaying(station, session);
    }
  }

  private async loadTrack(index: number, offset: number, session: number) {
    const track = this.program[index];
    if (!track || session !== this.session) return;
    this.index = index;
    this.pendingOffset = offset;
    const station = usePlayer.getState().station;
    usePlayer.setState({
      nowPlaying: { title: track.title, artist: track.artist, album: track.album, link: station?.website },
      position: offset,
      duration: track.duration,
    });
    this.audio.src = track.url;
    await this.safePlay(session);
  }

  private async attachStream(station: Station, session: number) {
    const url = station.streamUrl!;
    const fmt = detectFormat(url, station.format);
    const nativeHls = this.audio.canPlayType('application/vnd.apple.mpegurl') !== '';
    if (fmt === 'hls' && !nativeHls) {
      const { default: HlsLib } = await import('hls.js');
      if (session !== this.session) return;
      if (!HlsLib.isSupported()) {
        this.fail('Este navegador no puede reproducir transmisiones HLS.');
        return;
      }
      const hls = new HlsLib({ lowLatencyMode: false, enableWorker: true });
      this.hls = hls;
      hls.on(HlsLib.Events.ERROR, (_e, data) => {
        if (data.fatal && session === this.session) this.reconnectOnce('La transmisión HLS no está disponible.');
      });
      hls.loadSource(url);
      hls.attachMedia(this.audio);
    } else {
      // Se añade una marca para evitar que el navegador reutilice un búfer viejo del directo.
      const u = new URL(url);
      if (fmt !== 'hls') u.searchParams.set('_rm', String(Date.now()));
      this.audio.src = u.toString();
    }
    await this.safePlay(session);
  }

  private async safePlay(session: number) {
    try {
      await this.audio.play();
    } catch (e) {
      if (session !== this.session) return;
      const name = (e as DOMException)?.name;
      if (name === 'NotAllowedError') {
        this.clearStall();
        usePlayer.setState({ status: 'paused', error: 'El navegador pidió un toque más: pulsa reproducir para empezar.' });
      } else if (name !== 'AbortError') {
        // Los errores de red/formato se reportan por el evento 'error' del elemento.
      }
    }
  }

  pause() {
    this.session++;
    this.clearStall();
    this.stopNowPlaying();
    this.audio.pause();
    // En directo no tiene sentido guardar búfer: al reanudar se vuelve al momento en vivo.
    this.destroyHls();
    usePlayer.setState({ status: 'paused' });
    this.updateMediaSession();
  }

  resume() {
    const st = usePlayer.getState().station;
    if (st) void this.play(st);
  }

  toggle(station?: Station) {
    const { station: cur, status } = usePlayer.getState();
    if (station && cur?.id !== station.id) return void this.play(station);
    if (status === 'playing' || status === 'loading' || status === 'connecting') this.pause();
    else if (cur) void this.play(cur);
  }

  stop() {
    this.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    usePlayer.setState({ station: null, status: 'idle', nowPlaying: null, error: null, position: 0, duration: 0 });
  }

  setVolume(v: number) {
    const vol = Math.min(1, Math.max(0, v));
    this.audio.volume = vol;
    this.audio.muted = vol === 0;
    usePlayer.setState({ volume: vol, muted: vol === 0 });
  }

  toggleMute() {
    const muted = !this.audio.muted;
    this.audio.muted = muted;
    usePlayer.setState({ muted });
  }

  private destroyHls() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }

  private startNowPlaying(station: Station, session: number) {
    if (!station.nowPlaying) return;
    const src = station.nowPlaying;
    const tick = async () => {
      if (session !== this.session) return;
      this.npAbort?.abort();
      this.npAbort = new AbortController();
      try {
        const np = await fetchNowPlaying(src, station.streamUrl, this.npAbort.signal);
        if (session === this.session) {
          usePlayer.setState({ nowPlaying: np });
          this.updateMediaSession();
        }
      } catch {
        /* sin metadatos: se muestra solo el nombre de la emisora */
      }
    };
    void tick();
    this.npTimer = setInterval(tick, NOW_PLAYING_EVERY_MS);
  }

  private stopNowPlaying() {
    if (this.npTimer) clearInterval(this.npTimer);
    this.npTimer = null;
    this.npAbort?.abort();
    this.npAbort = null;
  }

  private bindMediaSession() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const safe = (action: MediaSessionAction, fn: () => void) => {
      try {
        ms.setActionHandler(action, fn);
      } catch {
        /* acción no soportada */
      }
    };
    safe('play', () => this.resume());
    safe('pause', () => this.pause());
    safe('stop', () => this.stop());
  }

  private updateMediaSession() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    const { station, nowPlaying, status } = usePlayer.getState();
    if (!station) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: nowPlaying?.title ?? station.name,
      artist: nowPlaying?.artist ?? station.name,
      album: nowPlaying?.title ? station.name : undefined,
      artwork: nowPlaying?.artwork ? [{ src: nowPlaying.artwork, sizes: '512x512' }] : [],
    });
    navigator.mediaSession.playbackState = status === 'playing' ? 'playing' : status === 'paused' ? 'paused' : 'none';
  }
}

let instance: RadioEngine | null = null;

/** Motor único compartido por toda la app. */
export function engine(): RadioEngine {
  if (!instance) instance = new RadioEngine();
  return instance;
}

/** Solo para pruebas. */
export function setEngineForTests(e: RadioEngine | null) {
  instance = e;
}
