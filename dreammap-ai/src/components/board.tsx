import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { BoardContent, DocumentFormat, ImageAsset } from '../core/types';
import { getTemplate, FONT_FAMILIES } from '../core/templates';
import { layoutBoard } from '../core/layout';
import { renderBoard, type Drawable } from '../core/render';
import { documentResolution } from '../core/formats';

/* ───────── Caché global de imágenes decodificadas ───────── */
const cache = new Map<string, HTMLImageElement | 'loading' | 'error'>();
let version = 0;
const subs = new Set<() => void>();
function notify() { version++; subs.forEach((f) => f()); }

function ensure(src: string) {
  if (cache.has(src)) return;
  cache.set(src, 'loading');
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => { cache.set(src, img); notify(); };
  img.onerror = () => { cache.set(src, 'error'); notify(); };
  img.src = src;
}

let fontsReady = false;
if (typeof document !== 'undefined' && document.fonts) {
  Promise.all(FONT_FAMILIES.map((f) => document.fonts.load(`600 40px "${f}"`).catch(() => null)))
    .then(() => document.fonts.ready)
    .then(() => { fontsReady = true; notify(); });
}

export function useImageMap(content: BoardContent, assetMap: Map<string, ImageAsset>): Map<string, Drawable> {
  const v = useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => version);
  return useMemo(() => {
    const m = new Map<string, Drawable>();
    for (const d of content.dreams) {
      if (!d.imageId) continue;
      const a = assetMap.get(d.imageId);
      if (!a) continue;
      ensure(a.src);
      const c = cache.get(a.src);
      if (c && typeof c !== 'string') m.set(a.id, c);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, assetMap, v, fontsReady]);
}

/* ───────── Miniatura estática del mapa (versiones, asistente, vista previa) ───────── */
export function BoardThumb(props: {
  format: DocumentFormat; templateId: string; content: BoardContent; assetMap: Map<string, ImageAsset>;
  maxW: number; maxH: number; guides?: boolean; onCanvas?: (c: HTMLCanvasElement) => void; className?: string;
}) {
  const { format, templateId, content, assetMap, maxW, maxH, guides, onCanvas } = props;
  const ref = useRef<HTMLCanvasElement>(null);
  const images = useImageMap(content, assetMap);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const t = getTemplate(templateId);
    const res = documentResolution(format);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const s = Math.min(maxW / res.totalPxW, maxH / res.totalPxH);
    const L = layoutBoard(format, t, content.dreams.map((d) => d.id), s * dpr);
    c.width = Math.max(1, Math.round(L.canvasW));
    c.height = Math.max(1, Math.round(L.canvasH));
    c.style.width = `${L.canvasW / dpr}px`;
    c.style.height = `${L.canvasH / dpr}px`;
    renderBoard(c.getContext('2d')!, L, t, content, images, { showGuides: guides });
    onCanvas?.(c);
  }, [format, templateId, content, images, maxW, maxH, guides, onCanvas]);
  return <canvas ref={ref} className={props.className} />;
}

/** Observa el tamaño disponible de un contenedor. */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 600, h: 600 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}
