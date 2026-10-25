import type { Station } from '@/lib/types';
import { detectFormat, stationIssues } from '@/lib/validate';
import { loadProgram } from '@/lib/archive';

export interface SourceTest {
  ok: boolean;
  message: string;
  ms?: number;
}

/**
 * Comprueba de verdad que una fuente entrega audio: carga el stream (o la primera pista del programa)
 * en un elemento de audio silenciado y espera a que haya datos reproducibles.
 */
export async function testSource(station: Station, timeoutMs = 15000): Promise<SourceTest> {
  const issues = stationIssues(station);
  if (issues.length) return { ok: false, message: issues.join(' ') };
  let url: string;
  let extra = '';
  if (station.kind === 'archive') {
    try {
      const tracks = await loadProgram(`test-${station.id}`, station.archive!);
      url = tracks[0]!.url;
      const hours = tracks.reduce((s, t) => s + t.duration, 0) / 3600;
      extra = ` ${tracks.length} pistas, ${hours.toFixed(1)} h de programación.`;
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  } else {
    url = station.streamUrl!;
    if (detectFormat(url, station.format) === 'hls') {
      // Para HLS basta con comprobar que la lista de reproducción responde y es válida.
      const t0 = performance.now();
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const text = await res.text();
        if (!res.ok || !text.startsWith('#EXTM3U')) return { ok: false, message: `La lista HLS no es válida (HTTP ${res.status}).` };
        return { ok: true, message: 'La lista HLS responde.', ms: Math.round(performance.now() - t0) };
      } catch {
        return { ok: false, message: 'No se pudo leer la lista HLS (servidor caído o sin CORS).' };
      }
    }
  }
  const audio = new Audio();
  audio.muted = true;
  audio.preload = 'auto';
  const t0 = performance.now();
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      audio.oncanplay = () => {
        clearTimeout(timer);
        resolve();
      };
      audio.onerror = () => {
        clearTimeout(timer);
        reject(new Error(String(audio.error?.code ?? 4)));
      };
      audio.src = url;
      audio.load();
    });
    return { ok: true, message: `La fuente entrega audio.${extra}`, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    const m = (e as Error).message;
    return { ok: false, message: m === 'timeout' ? 'La fuente no respondió a tiempo.' : 'La fuente no entrega audio compatible (caída, URL incorrecta o formato no soportado).' };
  } finally {
    audio.removeAttribute('src');
    audio.load();
  }
}
