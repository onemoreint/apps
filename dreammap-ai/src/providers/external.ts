import type { AIImageProvider, AIImageRequest, ImageAsset, PinterestReferenceProvider } from '../core/types';
import { assetFromBlob } from './assets';

/* ───────────── PINTEREST (solo referencia, sin scraping) ───────────── */

export const pinterest: PinterestReferenceProvider = {
  searchUrl: (q) => `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}`,
  isValidReference: (url) => /^https?:\/\/([a-z]+\.)?(pinterest\.[a-z.]+|pin\.it)\//i.test(url.trim()),
};

/* ───────────── GENERACIÓN CON IA ───────────── */

/**
 * Proveedor real: llama a SU backend (p. ej. /api/generate-image), que guarda la
 * API key en variables de entorno. El frontend nunca contiene claves.
 * Contrato: POST JSON {prompt, style, width, height} → imagen binaria (image/*)
 * o JSON {image: "data:image/png;base64,..."} | {url: "https://..."}.
 */
export class BackendAIImageProvider implements AIImageProvider {
  readonly id = 'backend';
  readonly name: string;
  readonly isReal = true;
  private endpoint: string;
  constructor(endpoint: string, name = 'Tu servidor de IA') {
    this.endpoint = endpoint;
    this.name = name;
  }
  async generate(req: AIImageRequest): Promise<ImageAsset> {
    const res = await fetch(this.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) });
    if (!res.ok) throw new Error(`El servidor de IA respondió ${res.status}`);
    let blob: Blob;
    const ct = res.headers.get('content-type') ?? '';
    if (ct.startsWith('image/')) blob = await res.blob();
    else {
      const j = await res.json();
      const src: string | undefined = j.image ?? j.url;
      if (!src) throw new Error('Respuesta del servidor sin imagen');
      blob = await (await fetch(src)).blob();
    }
    return assetFromBlob(blob, {
      source: 'ai',
      title: req.prompt.slice(0, 60),
      tags: ['ia', req.style],
      origin: { provider: this.name, prompt: req.prompt },
      license: { name: 'Generada con IA — revisa los términos de tu proveedor', commercialUse: 'unknown' },
    });
  }
}

/**
 * Modo demostración: crea una ilustración abstracta local a partir del prompt,
 * claramente marcada como DEMO. Permite probar el flujo completo sin API.
 */
export class DemoAIImageProvider implements AIImageProvider {
  readonly id = 'demo';
  readonly name = 'Demostración (sin IA real)';
  readonly isReal = false;
  async generate(req: AIImageRequest): Promise<ImageAsset> {
    const long = 2400;
    const ratio = req.width / req.height;
    const w = ratio >= 1 ? long : Math.round(long * ratio);
    const h = ratio >= 1 ? Math.round(long / ratio) : long;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    let seed = 0;
    for (const ch of req.prompt) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const PAL: Record<string, string[]> = {
      fotorealista: ['#1e3a5f', '#f4a261', '#e9c46a', '#2a9d8f'],
      cinematografico: ['#0b132b', '#1c2541', '#f77f00', '#fcbf49'],
      editorial: ['#f2e9e4', '#c9ada7', '#4a4e69', '#22223b'],
      luxury: ['#0a0908', '#22333b', '#c6ac8f', '#eae0d5'],
      minimalista: ['#f8f9fa', '#dee2e6', '#adb5bd', '#212529'],
      inspiracional: ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec'],
    };
    const pal = PAL[req.style] ?? PAL.inspiracional;
    const g = ctx.createLinearGradient(0, 0, w * rnd(), h);
    g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {
      const rg = ctx.createRadialGradient(w * rnd(), h * rnd(), 0, w * rnd(), h * rnd(), Math.max(w, h) * (0.15 + rnd() * 0.4));
      rg.addColorStop(0, pal[2 + (i % 2)] + 'cc'); rg.addColorStop(1, pal[2 + (i % 2)] + '00');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, h * 0.8, w, h * 0.2);
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.round(Math.min(w, h) * 0.05)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('VISTA PREVIA DEMO · conecta un proveedor de IA', w / 2, h * 0.9);
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/png'));
    return assetFromBlob(blob, {
      source: 'ai',
      title: `Demo IA · ${req.style}`,
      tags: ['ia', 'demo', req.style],
      origin: { provider: this.name, prompt: req.prompt },
      license: { name: 'Imagen de demostración', commercialUse: true },
    });
  }
}

export function getAIProvider(endpoint: string | null | undefined): AIImageProvider {
  return endpoint ? new BackendAIImageProvider(endpoint) : new DemoAIImageProvider();
}
