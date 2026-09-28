import type { BoardContent, Rect, VisionBoardCanvas, Dream, LayoutCell } from './types';
import type { DesignTemplate, WordStyle } from './templates';
import { imageRectForCell, seeded } from './layout';

export type Drawable = CanvasImageSource & { width: number; height: number };

export type RenderOptions = {
  showGuides?: boolean;
  selectedDreamId?: string | null;
  /** true para vista previa: dibuja los marcadores de "sin imagen". */
  editor?: boolean;
};

const CATEGORY_EMOJI: Record<string, string> = {
  hogar: '🏡', viajes: '✈️', auto: '🚗', salud: '💪', familia: '👨‍👩‍👧', dinero: '💰',
  estudio: '🎓', negocio: '🚀', amor: '❤️', espiritual: '🧘', otro: '✨',
};
export function categoryEmoji(c: string) {
  return CATEGORY_EMOJI[c] ?? '✨';
}

/** Tamaño del texto del pie de foto (se usa también en la validación de impresión). */
export function captionFontPx(caption: Rect, t?: Pick<DesignTemplate, 'card'>): number {
  const base = Math.max(4, Math.min(caption.h * 0.36, caption.w * 0.075));
  return base * (t?.card.captionScale ?? 1);
}
export function titleFontPx(layout: VisionBoardCanvas): number {
  const h = layout.header;
  return layout.headerMode === 'side' ? Math.min(h.w * 0.16, h.h * 0.09) : Math.min(h.h * 0.4, h.w * 0.085);
}

/* ───────────────────────── utilidades de dibujo ───────────────────────── */

function roundRect(ctx: CanvasRenderingContext2D, r: Rect, radius: number) {
  const rad = Math.max(0, Math.min(radius, r.w / 2, r.h / 2));
  ctx.beginPath();
  ctx.moveTo(r.x + rad, r.y);
  ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, rad);
  ctx.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, rad);
  ctx.arcTo(r.x, r.y + r.h, r.x, r.y, rad);
  ctx.arcTo(r.x, r.y, r.x + r.w, r.y, rad);
  ctx.closePath();
}

function shapePath(ctx: CanvasRenderingContext2D, r: Rect, t: DesignTemplate) {
  const short = Math.min(r.w, r.h);
  switch (t.card.shape) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(r.x + r.w / 2, r.y + r.h / 2, short / 2, 0, Math.PI * 2);
      ctx.closePath();
      return;
    case 'pill':
      roundRect(ctx, r, short / 2);
      return;
    case 'arch': {
      const rad = r.w / 2;
      if (r.h < rad * 1.1) { roundRect(ctx, r, short * 0.2); return; }
      const b = short * t.card.radius;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y + rad);
      ctx.arc(r.x + rad, r.y + rad, rad, Math.PI, 0);
      ctx.lineTo(r.x + r.w, r.y + r.h - b);
      ctx.arcTo(r.x + r.w, r.y + r.h, r.x + r.w - b, r.y + r.h, b);
      ctx.lineTo(r.x + b, r.y + r.h);
      ctx.arcTo(r.x, r.y + r.h, r.x, r.y + r.h - b, b);
      ctx.closePath();
      return;
    }
    case 'frame':
    case 'film':
      roundRect(ctx, r, short * 0.012);
      return;
    default:
      roundRect(ctx, r, short * t.card.radius);
  }
}

function hexA(color: string, a: number) {
  if (!color.startsWith('#')) return color;
  const h = color.length === 4 ? color.slice(1).split('').map((c) => c + c).join('') : color.slice(1, 7);
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, fontPx: number, fontFor: (px: number) => string, maxLines: number, minPx: number): { lines: string[]; px: number } {
  let px = fontPx;
  while (px >= minPx) {
    ctx.font = fontFor(px);
    const lines = wrap(ctx, text, maxW);
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxW)) return { lines, px };
    px *= 0.92;
  }
  ctx.font = fontFor(minPx);
  const lines = wrap(ctx, text, maxW).slice(0, maxLines);
  return { lines: lines.map((l, i) => (i === maxLines - 1 ? ellipsize(ctx, l, maxW) : l)), px: minPx };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width <= maxW || !cur) cur = test;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

function ellipsize(ctx: CanvasRenderingContext2D, s: string, maxW: number) {
  if (ctx.measureText(s).width <= maxW) return s;
  let t = s;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

/* ───────────────────────── texturas (mosaicos repetibles) ───────────────────────── */

const tiles = new Map<string, HTMLCanvasElement>();
function tile(kind: 'paper' | 'cork' | 'linen' | 'grain', base: string, ink: string): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const key = `${kind}|${base}|${ink}`;
  const hit = tiles.get(key);
  if (hit) return hit;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const x = c.getContext('2d')!;
  const rnd = seeded(key);
  if (kind !== 'grain') { x.fillStyle = base; x.fillRect(0, 0, S, S); }
  if (kind === 'paper') {
    for (let i = 0; i < 2600; i++) { x.fillStyle = hexA(rnd() > 0.5 ? ink : '#ffffff', 0.05 + rnd() * 0.12); x.fillRect(rnd() * S, rnd() * S, 1, 1); }
    x.lineWidth = 0.6;
    for (let i = 0; i < 70; i++) {
      x.strokeStyle = hexA(ink, 0.18 + rnd() * 0.2);
      const px = rnd() * S, py = rnd() * S, a = rnd() * Math.PI, l = 4 + rnd() * 12;
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + rnd() * 3, py + Math.sin(a) * l * 0.5, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
    }
  } else if (kind === 'cork') {
    for (let i = 0; i < 1400; i++) {
      const dark = rnd() > 0.45;
      x.fillStyle = dark ? hexA(ink, 0.25 + rnd() * 0.5) : hexA('#e8c89c', 0.25 + rnd() * 0.45);
      x.beginPath(); x.ellipse(rnd() * S, rnd() * S, 0.6 + rnd() * 2.2, 0.5 + rnd() * 1.6, rnd() * Math.PI, 0, Math.PI * 2); x.fill();
    }
  } else if (kind === 'linen') {
    for (let i = 0; i < S; i += 2) {
      x.fillStyle = hexA(ink, 0.12 + rnd() * 0.14); x.fillRect(0, i, S, 1);
      x.fillStyle = hexA(ink, 0.08 + rnd() * 0.1); x.fillRect(i, 0, 1, S);
    }
  } else {
    const img = x.createImageData(S, S);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rnd() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
  }
  tiles.set(key, c);
  return c;
}

function fillPattern(ctx: CanvasRenderingContext2D, source: HTMLCanvasElement, w: number, h: number, unit: number, alpha = 1) {
  const p = ctx.createPattern(source, 'repeat');
  if (!p) return;
  const k = Math.max(0.5, unit / 900);
  try { p.setTransform(new DOMMatrix().scale(k, k)); } catch { /* navegadores antiguos */ }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = p;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/* ───────────────────────── fondo ───────────────────────── */

function paintBackground(ctx: CanvasRenderingContext2D, t: DesignTemplate, L: VisionBoardCanvas) {
  const w = L.canvasW, h = L.canvasH;
  const unit = Math.min(L.trim.w, L.trim.h);
  const bg = t.background;
  if (bg.type === 'solid') {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, w, h);
  } else if (bg.type === 'gradient') {
    const a = (bg.angle * Math.PI) / 180;
    const cx = w / 2, cy = h / 2;
    const len = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
    const dx = (Math.sin(a) * len) / 2, dy = (-Math.cos(a) * len) / 2;
    const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    g.addColorStop(0, bg.from);
    g.addColorStop(1, bg.to);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (bg.type === 'aura') {
    ctx.fillStyle = bg.base;
    ctx.fillRect(0, 0, w, h);
    const rnd = seeded('aura' + t.id);
    const big = Math.max(w, h);
    bg.blobs.forEach((col) => {
      const x = w * (0.1 + rnd() * 0.8), y = h * (0.1 + rnd() * 0.8), r = big * (0.35 + rnd() * 0.35);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, hexA(col, 0.95));
      g.addColorStop(1, hexA(col, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  } else {
    ctx.fillStyle = bg.base;
    ctx.fillRect(0, 0, w, h);
    const tl = tile(bg.kind, bg.base, bg.ink);
    if (tl) fillPattern(ctx, tl, w, h, unit);
    // viñeta suave
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.16)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

function star4(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.closePath();
  ctx.fill();
}

function inside(r: Rect, x: number, y: number) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function paintBackdropDecor(ctx: CanvasRenderingContext2D, t: DesignTemplate, L: VisionBoardCanvas) {
  const unit = Math.min(L.trim.w, L.trim.h);
  const rnd = seeded('decor' + t.id);
  if (t.decor.includes('dots')) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    const step = unit * 0.05;
    for (let y = L.trim.y; y < L.trim.y + L.trim.h; y += step)
      for (let x = L.trim.x; x < L.trim.x + L.trim.w; x += step) { ctx.beginPath(); ctx.arc(x, y, unit * 0.003, 0, Math.PI * 2); ctx.fill(); }
  }
  if (t.decor.includes('stars')) {
    const count = 160;
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.6})`;
      ctx.beginPath();
      ctx.arc(L.trim.x + rnd() * L.trim.w, L.trim.y + rnd() * L.trim.h, unit * (0.0012 + rnd() * 0.0025), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = hexA(t.accent, 0.9);
    for (let i = 0; i < 8; i++) {
      const x = L.trim.x + rnd() * L.trim.w, y = L.trim.y + rnd() * L.trim.h;
      if (inside(L.header, x, y)) continue;
      star4(ctx, x, y, unit * (0.01 + rnd() * 0.012));
    }
  }
  if (t.decor.includes('sparkles')) {
    ctx.fillStyle = hexA(t.accent, 0.85);
    let placed = 0, tries = 0;
    while (placed < 12 && tries++ < 200) {
      const x = L.trim.x + rnd() * L.trim.w, y = L.trim.y + rnd() * L.trim.h;
      if (inside(L.header, x, y)) continue;
      star4(ctx, x, y, unit * (0.008 + rnd() * 0.016));
      placed++;
    }
  }
}

/* ───────────────────────── cabecera ───────────────────────── */

function titleFontString(t: DesignTemplate, px: number) {
  return `${t.titleItalic ? 'italic ' : ''}${t.titleWeight} ${px}px "${t.titleFont}", Georgia, serif`;
}

/** Título + frase ajustados a un rectángulo. Devuelve el borde inferior del texto. */
function drawTitleBlock(
  ctx: CanvasRenderingContext2D, rect: Rect, t: DesignTemplate, title: string, subtitle: string,
  opts: { align: 'center' | 'left'; valign: 'middle' | 'top' | 'bottom'; maxLines: number; startPx: number },
): number {
  const text = t.titleUppercase ? title.toUpperCase() : title;
  const tf = (px: number) => titleFontString(t, px);
  ctx.letterSpacing = t.titleUppercase ? `${opts.startPx * 0.06}px` : '0px';
  let fit = fitText(ctx, text, rect.w, opts.startPx, tf, opts.maxLines, opts.startPx * 0.35);
  const blockOf = (px: number, n: number) => px * 1.12 * n + (subtitle ? px * 0.34 * 2.1 : 0) + px * 0.25;
  let guard = 0;
  while (blockOf(fit.px, fit.lines.length) > rect.h * 0.94 && guard++ < 14) {
    fit = fitText(ctx, text, rect.w, fit.px * 0.9, tf, opts.maxLines, fit.px * 0.9);
  }
  if (t.titleUppercase) ctx.letterSpacing = `${fit.px * 0.06}px`;
  const lineH = fit.px * 1.12;
  const subPx = fit.px * 0.34;
  const blockH = blockOf(fit.px, fit.lines.length);
  let y = opts.valign === 'top' ? rect.y + fit.px : opts.valign === 'bottom' ? rect.y + rect.h - blockH + fit.px * 0.95 : rect.y + (rect.h - blockH) / 2 + fit.px * 0.95;
  ctx.textAlign = opts.align;
  ctx.textBaseline = 'alphabetic';
  const tx = opts.align === 'center' ? rect.x + rect.w / 2 : rect.x;
  ctx.fillStyle = t.titleColor;
  ctx.font = tf(fit.px);
  let bottom = y;
  for (const l of fit.lines) { ctx.fillText(l, tx, y); bottom = y + fit.px * 0.25; y += lineH; }
  ctx.letterSpacing = '0px';
  if (subtitle) {
    ctx.fillStyle = t.subtitleColor;
    const sf = (px: number) => `500 ${px}px "${t.bodyFont}", Inter, sans-serif`;
    const sp = t.bodyFont === 'Caveat' ? subPx * 1.5 : subPx;
    const subFit = fitText(ctx, subtitle, rect.w, sp, sf, 3, sp * 0.5);
    ctx.font = sf(subFit.px);
    y += subFit.px * 0.35;
    for (const l of subFit.lines) { ctx.fillText(l, tx, y); bottom = y + subFit.px * 0.3; y += subFit.px * 1.3; }
  }
  return bottom + subPx * 0.9;
}

function drawHeader(ctx: CanvasRenderingContext2D, L: VisionBoardCanvas, t: DesignTemplate, content: BoardContent) {
  const header = L.header;
  const side = L.headerMode === 'side';
  const align: 'center' | 'left' = t.headerAlign === 'center' && !side ? 'center' : 'left';
  const unit = Math.min(L.trim.w, L.trim.h);
  const startPx = titleFontPx(L) * (t.titleFont === 'Caveat' ? 1.25 : 1);

  if (t.header === 'year') {
    const m = `${content.subtitle} ${content.title}`.match(/\b(19|20)\d{2}\b/);
    if (m) {
      const year = m[0];
      const yf = (px: number) => `400 ${px}px "${t.titleFont}", Georgia, serif`;
      let ypx = side ? header.w * 0.42 : header.h * 1.02;
      ctx.font = yf(ypx);
      const maxW = side ? header.w : header.w * 0.46;
      const w0 = ctx.measureText(year).width;
      if (w0 > maxW) { ypx *= maxW / w0; ctx.font = yf(ypx); }
      const yw = ctx.measureText(year).width;
      ctx.fillStyle = t.accent;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      const baseY = side ? header.y + ypx * 0.8 : header.y + header.h * 0.9;
      ctx.fillText(year, header.x - ypx * 0.02, baseY);
      const rest: Rect = side
        ? { x: header.x, y: baseY + ypx * 0.15, w: header.w, h: header.h - (baseY + ypx * 0.15 - header.y) }
        : { x: header.x + yw + L.gap * 1.2, y: header.y, w: header.w - yw - L.gap * 1.2, h: header.h * 0.92 };
      const subtitle = content.subtitle.replace(year, '').replace(/^[\s·\-–—|]+/, '').trim();
      const bottom = drawTitleBlock(ctx, rest, t, content.title, subtitle, { align: 'left', valign: side ? 'top' : 'bottom', maxLines: side ? 4 : 2, startPx: side ? startPx : Math.min(rest.h * 0.42, startPx) });
      if (t.decor.includes('lines')) {
        ctx.fillStyle = t.titleColor;
        const lh = Math.max(1, unit * 0.002);
        if (!side) ctx.fillRect(header.x, header.y + header.h - lh, header.w, lh);
        else ctx.fillRect(header.x, bottom, header.w * 0.5, lh);
      }
      return;
    }
  }

  ctx.save();
  if (t.header === 'script' && !side) {
    const cx = header.x + header.w / 2, cy = header.y + header.h / 2;
    ctx.translate(cx, cy); ctx.rotate(-0.025); ctx.translate(-cx, -cy);
  }
  const bottom = drawTitleBlock(ctx, header, t, content.title, content.subtitle, { align, valign: side ? 'top' : 'middle', maxLines: side ? 4 : 2, startPx });
  ctx.restore();

  const lw = Math.max(1, unit * 0.0016);
  if (t.decor.includes('lines')) {
    ctx.strokeStyle = t.accent; ctx.lineWidth = lw; ctx.beginPath();
    const ly = Math.min(header.y + header.h - 1, bottom);
    const w = align === 'center' ? header.w * 0.3 : header.w * 0.18;
    const x = align === 'center' ? header.x + (header.w - w) / 2 : header.x;
    ctx.moveTo(x, ly); ctx.lineTo(x + w, ly); ctx.stroke();
  }
  if (t.decor.includes('deco') && !side) {
    // Filete con rombo al estilo Art Déco
    ctx.strokeStyle = t.accent; ctx.fillStyle = t.accent; ctx.lineWidth = lw;
    const ly = Math.min(header.y + header.h - 1, bottom);
    const cx = header.x + header.w / 2, half = header.w * 0.2, d = unit * 0.006;
    ctx.beginPath(); ctx.moveTo(cx - half, ly); ctx.lineTo(cx - d * 2, ly); ctx.moveTo(cx + d * 2, ly); ctx.lineTo(cx + half, ly); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, ly - d); ctx.lineTo(cx + d, ly); ctx.lineTo(cx, ly + d); ctx.lineTo(cx - d, ly); ctx.closePath(); ctx.fill();
  }
  if (t.decor.includes('stars')) {
    // Luna creciente
    const r = Math.min(header.h, header.w) * (side ? 0.06 : 0.16);
    const mx = side ? header.x + r : header.x + header.w - r * 1.2;
    const my = side ? header.y + header.h - r * 1.5 : header.y + header.h * 0.45;
    ctx.save();
    ctx.beginPath();
    ctx.rect(mx - r * 2, my - r * 2, r * 4, r * 4);
    ctx.arc(mx + r * 0.42, my - r * 0.18, r * 0.86, 0, Math.PI * 2);
    ctx.clip('evenodd');
    ctx.fillStyle = t.accent;
    ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

/* ───────────────────────── celdas ───────────────────────── */

function drawPlaceholder(ctx: CanvasRenderingContext2D, r: Rect, t: DesignTemplate, dream: Dream, editor: boolean) {
  const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  g.addColorStop(0, hexA(t.accent, 0.35));
  g.addColorStop(1, hexA(t.accent, 0.1));
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  const e = Math.min(r.w, r.h) * 0.3;
  ctx.font = `${e}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = t.titleColor;
  ctx.fillText(categoryEmoji(dream.category), r.x + r.w / 2, r.y + r.h / 2 - (editor ? e * 0.25 : 0));
  if (editor) {
    ctx.font = `600 ${Math.max(8, Math.min(r.w, r.h) * 0.07)}px Inter, sans-serif`;
    ctx.fillStyle = hexA(t.titleColor, 0.75);
    ctx.fillText('Toca para elegir imagen', r.x + r.w / 2, r.y + r.h / 2 + e * 0.55);
  }
}

/** Dibuja la imagen cubriendo el rectángulo, respetando el punto focal. */
export function drawCover(ctx: CanvasRenderingContext2D, img: Drawable, r: Rect, fx = 0.5, fy = 0.5) {
  const iw = img.width, ih = img.height;
  if (!iw || !ih) return;
  const s = Math.max(r.w / iw, r.h / ih);
  const sw = r.w / s, sh = r.h / s;
  const sx = Math.min(Math.max(0, fx * iw - sw / 2), iw - sw);
  const sy = Math.min(Math.max(0, fy * ih - sh / 2), ih - sh);
  ctx.drawImage(img, sx, sy, sw, sh, r.x, r.y, r.w, r.h);
}

function drawTape(ctx: CanvasRenderingContext2D, cell: Rect, t: DesignTemplate, rnd: () => number) {
  const colors = t.tapeColors ?? ['rgba(255,255,255,0.6)'];
  const w = cell.w * (0.28 + rnd() * 0.1);
  const h = Math.min(cell.w, cell.h) * 0.085;
  const cx = cell.x + cell.w * (0.35 + rnd() * 0.3);
  const cy = cell.y + h * 0.1;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rnd() - 0.5) * 0.35);
  ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
  // bordes dentados de cinta rasgada
  const teeth = 7, tw = h / teeth;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(w / 2, -h / 2);
  for (let i = 0; i < teeth; i++) ctx.lineTo(w / 2 + (i % 2 ? 0 : tw * 0.6), -h / 2 + tw * (i + 1));
  ctx.lineTo(-w / 2, h / 2);
  for (let i = 0; i < teeth; i++) ctx.lineTo(-w / 2 - (i % 2 ? 0 : tw * 0.6), h / 2 - tw * (i + 1));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let x = -w / 2 + h * 0.3; x < w / 2; x += h * 0.6) ctx.fillRect(x, -h / 2, h * 0.18, h);
  ctx.restore();
}

function drawPin(ctx: CanvasRenderingContext2D, cell: Rect, t: DesignTemplate, rnd: () => number) {
  const colors = t.pinColors ?? ['#d64541'];
  const r = Math.min(cell.w, cell.h) * 0.045;
  const x = cell.x + cell.w * (0.45 + rnd() * 0.1);
  const y = cell.y + r * 1.4;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(x + r * 0.5, y + r * 0.6, r, r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
  const col = colors[Math.floor(rnd() * colors.length)];
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, col); g.addColorStop(1, hexA(col.length === 7 ? col : '#000000', 1));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawSprockets(ctx: CanvasRenderingContext2D, frame: Rect, image: Rect) {
  const band = image.x - frame.x;
  const hw = band * 0.42, hh = band * 0.3;
  const step = hh * 2.1;
  ctx.fillStyle = 'rgba(236,229,214,0.92)';
  for (let y = frame.y + step * 0.4; y + hh < frame.y + frame.h - step * 0.2; y += step) {
    roundRect(ctx, { x: frame.x + (band - hw) / 2, y, w: hw, h: hh }, hh * 0.25); ctx.fill();
    roundRect(ctx, { x: image.x + image.w + (band - hw) / 2, y, w: hw, h: hh }, hh * 0.25); ctx.fill();
  }
}

function drawCell(
  ctx: CanvasRenderingContext2D, cell: LayoutCell, index: number, t: DesignTemplate, dream: Dream,
  img: Drawable | undefined, opts: RenderOptions, unit: number,
) {
  const r = cell.rect;
  const rnd = seeded('cell' + dream.id);
  const { image: ir, caption: cr, frame } = imageRectForCell(r, t);
  ctx.save();
  if (cell.rotation) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    ctx.translate(cx, cy); ctx.rotate(cell.rotation); ctx.translate(-cx, -cy);
  }

  // Sombra y marco
  if (frame) {
    ctx.save();
    if (t.card.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.32)';
      ctx.shadowBlur = unit * 0.018;
      ctx.shadowOffsetY = unit * 0.006;
    }
    const colors = t.card.frameColors ?? ['#ffffff'];
    ctx.fillStyle = colors[index % colors.length];
    roundRect(ctx, frame, Math.min(frame.w, frame.h) * (t.card.shape === 'frame' ? t.card.radius : 0.012));
    ctx.fill();
    ctx.restore();
    if (t.card.shape === 'film') drawSprockets(ctx, frame, ir);
  } else if (t.card.shadow) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.28)';
    ctx.shadowBlur = unit * 0.02;
    ctx.shadowOffsetY = unit * 0.006;
    shapePath(ctx, ir, t);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fill();
    ctx.restore();
  }

  // Imagen recortada con la forma
  ctx.save();
  if (t.card.shape === 'frame' || t.card.shape === 'film') roundRect(ctx, ir, Math.min(ir.w, ir.h) * (t.card.shape === 'frame' ? t.card.radius * 0.6 : 0.01));
  else shapePath(ctx, ir, t);
  ctx.clip();
  if (img) {
    if (t.card.imageFilter) ctx.filter = t.card.imageFilter;
    drawCover(ctx, img, ir, dream.focusX, dream.focusY);
    ctx.filter = 'none';
  } else drawPlaceholder(ctx, ir, t, dream, !!opts.editor);
  if (t.card.caption === 'overlay' && cr && dream.title) {
    const g = ctx.createLinearGradient(0, cr.y, 0, cr.y + cr.h);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, t.card.captionBg);
    ctx.fillStyle = g;
    ctx.fillRect(cr.x, cr.y, cr.w, cr.h);
  }
  ctx.restore();

  if (t.card.border) {
    ctx.strokeStyle = t.card.border.color;
    ctx.lineWidth = Math.max(1, unit * t.card.border.width);
    if (t.card.shape === 'frame' || t.card.shape === 'film') roundRect(ctx, ir, 0);
    else shapePath(ctx, ir, t);
    ctx.stroke();
  }

  // Pie de foto
  if (cr && dream.title) {
    const cpx = captionFontPx(cr, t);
    const up = !!t.card.captionUppercase;
    const text = up ? dream.title.toUpperCase() : dream.title;
    const cf = (px: number) => `${t.card.captionWeight} ${px}px "${t.card.captionFont}", Inter, sans-serif`;
    const pad = t.card.caption === 'below' && t.card.shape !== 'circle' ? 0 : cr.w * 0.06;
    ctx.letterSpacing = up ? `${cpx * 0.08}px` : '0px';
    const fit = fitText(ctx, text, cr.w - pad * 2, cpx, cf, 2, cpx * 0.55);
    ctx.font = cf(fit.px);
    ctx.fillStyle = t.card.captionColor;
    const left = t.card.caption === 'below' && t.headerAlign === 'left' && t.card.shape !== 'circle' && t.card.shape !== 'arch';
    ctx.textAlign = left ? 'left' : 'center';
    ctx.textBaseline = 'alphabetic';
    const cx = left ? cr.x : cr.x + cr.w / 2;
    const lh = fit.px * 1.15;
    let cy = t.card.caption === 'overlay'
      ? cr.y + cr.h - Math.max(pad * 0.6, cr.h * 0.12) - lh * (fit.lines.length - 1)
      : cr.y + (cr.h - lh * fit.lines.length) / 2 + fit.px * 0.9;
    for (const l of fit.lines) { ctx.fillText(l, cx, cy); cy += lh; }
    ctx.letterSpacing = '0px';
  }

  if (t.decor.includes('tape')) drawTape(ctx, r, t, rnd);
  if (t.decor.includes('pins')) drawPin(ctx, r, t, rnd);

  if (opts.selectedDreamId === dream.id) {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = Math.max(2, unit * 0.006);
    ctx.setLineDash([]);
    roundRect(ctx, r, Math.min(r.w, r.h) * 0.02);
    ctx.stroke();
  }
  ctx.restore();
}

/* ───────────────────────── palabras de poder ───────────────────────── */

function drawWords(ctx: CanvasRenderingContext2D, L: VisionBoardCanvas, t: DesignTemplate, words: string[]) {
  const cells = L.cells;
  if (!cells.length || !words.length) return;
  const unit = Math.min(L.trim.w, L.trim.h);
  const style: WordStyle = t.wordStyle ?? 'sticker';
  const list = words.slice(0, Math.min(8, cells.length));
  list.forEach((word, i) => {
    // Una palabra por foto, repartidas de forma pareja y sobre el borde superior (no tapan los pies de foto).
    const cell = cells[Math.min(cells.length - 1, Math.floor(((i + 0.5) * cells.length) / list.length))];
    const r = cell.rect;
    const rnd = seeded('word' + word + i);
    const corner = i % 2 === 0 ? 0 : 2;
    const px = Math.min(Math.max(Math.min(r.w, r.h) * 0.085, unit * 0.018), unit * 0.036) * (style === 'note' ? 1.25 : 1);
    const font = style === 'label' ? `500 ${px}px "DM Mono", monospace` : style === 'note' ? `700 ${px}px "Caveat", cursive` : `700 ${px}px "${t.bodyFont}", sans-serif`;
    const text = style === 'label' ? word.toUpperCase() : word;
    ctx.save();
    ctx.font = font;
    if (style === 'label') ctx.letterSpacing = `${px * 0.12}px`;
    const tw = ctx.measureText(text).width;
    let w: number, h: number;
    if (style === 'note') { w = Math.max(tw + px * 1.2, px * 3.4); h = Math.max(px * 2.6, w * 0.62); }
    else if (style === 'label') { w = tw + px * 1.4; h = px * 1.9; }
    else { w = tw + px * 1.6; h = px * 2; }
    let x = corner === 0 ? r.x + r.w - w * 0.8 : r.x - w * 0.2;
    let y = r.y - h * 0.35;
    x = Math.min(Math.max(x, L.area.x), L.area.x + L.area.w - w);
    y = Math.min(Math.max(y, L.area.y), L.area.y + L.area.h - h);
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((rnd() - 0.5) * 0.24);
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = px * 0.4;
    ctx.shadowOffsetY = px * 0.12;
    const colors = t.wordColors ?? ['#ffffff'];
    if (style === 'note') ctx.fillStyle = colors[i % colors.length];
    else if (style === 'label') ctx.fillStyle = '#121212';
    else ctx.fillStyle = t.accent;
    roundRect(ctx, { x: -w / 2, y: -h / 2, w, h }, style === 'sticker' ? h / 2 : style === 'label' ? px * 0.2 : px * 0.08);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = style === 'note' ? '#2a2217' : style === 'label' ? '#f5f5f5' : colors[0];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, px * 0.05);
    ctx.restore();
  });
}

/* ───────────────────────── render principal ───────────────────────── */

export function renderBoard(
  ctx: CanvasRenderingContext2D,
  layout: VisionBoardCanvas,
  t: DesignTemplate,
  content: BoardContent,
  images: Map<string, Drawable>,
  opts: RenderOptions = {},
) {
  const { canvasW, canvasH, cells } = layout;
  const unit = Math.min(layout.trim.w, layout.trim.h);
  ctx.save();
  ctx.clearRect(0, 0, canvasW, canvasH);
  paintBackground(ctx, t, layout);
  paintBackdropDecor(ctx, t, layout);
  drawHeader(ctx, layout, t, content);

  const dreamsById = new Map(content.dreams.map((d) => [d.id, d]));
  cells.forEach((cell, i) => {
    const dream = dreamsById.get(cell.dreamId);
    if (!dream) return;
    const img = dream.imageId ? images.get(dream.imageId) : undefined;
    drawCell(ctx, cell, i, t, dream, img, opts, unit);
  });

  if (t.decor.includes('words')) {
    const words = (content.words ?? []).map((w) => w.trim()).filter(Boolean);
    drawWords(ctx, layout, t, words);
  }

  if (t.decor.includes('deco')) {
    const { safe, area } = layout;
    const inset = (area.x - safe.x) * 0.5;
    const lw = Math.max(1, unit * 0.0016);
    ctx.strokeStyle = t.accent;
    ctx.lineWidth = lw;
    const r1: Rect = { x: safe.x + inset, y: safe.y + inset, w: safe.w - inset * 2, h: safe.h - inset * 2 };
    ctx.strokeRect(r1.x, r1.y, r1.w, r1.h);
    const g = Math.max(lw * 3, unit * 0.005);
    ctx.strokeRect(r1.x + g, r1.y + g, r1.w - g * 2, r1.h - g * 2);
    // abanicos en las esquinas
    const f = unit * 0.03;
    ctx.fillStyle = t.accent;
    for (const [x, y, a] of [[r1.x, r1.y, 0], [r1.x + r1.w, r1.y, Math.PI / 2], [r1.x + r1.w, r1.y + r1.h, Math.PI], [r1.x, r1.y + r1.h, -Math.PI / 2]] as const) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      for (let k = 0; k < 4; k++) {
        ctx.beginPath(); ctx.moveTo(g, g); ctx.arc(g, g, f * (1 - k * 0.22), 0, Math.PI / 2); ctx.closePath();
        ctx.globalAlpha = k % 2 ? 0.35 : 0.8; ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  if (t.decor.includes('grain')) {
    const tl = tile('grain', '#000', '#000');
    if (tl) fillPattern(ctx, tl, canvasW, canvasH, unit, t.background.type === 'solid' && t.background.color < '#444' ? 0.07 : 0.05);
  }

  if (opts.showGuides) drawGuides(ctx, layout);
  ctx.restore();
}

export function drawGuides(ctx: CanvasRenderingContext2D, layout: VisionBoardCanvas) {
  const { trim, safe, canvasW, canvasH } = layout;
  const lw = Math.max(1, Math.min(canvasW, canvasH) * 0.002);
  ctx.save();
  if (trim.x > 0.5) {
    ctx.fillStyle = 'rgba(239,68,68,0.28)';
    ctx.fillRect(0, 0, canvasW, trim.y);
    ctx.fillRect(0, trim.y + trim.h, canvasW, canvasH - trim.y - trim.h);
    ctx.fillRect(0, trim.y, trim.x, trim.h);
    ctx.fillRect(trim.x + trim.w, trim.y, canvasW - trim.x - trim.w, trim.h);
  }
  ctx.lineWidth = lw;
  ctx.setLineDash([lw * 5, lw * 4]);
  ctx.strokeStyle = '#ef4444';
  ctx.strokeRect(trim.x, trim.y, trim.w, trim.h);
  ctx.strokeStyle = '#06b6d4';
  ctx.strokeRect(safe.x, safe.y, safe.w, safe.h);
  ctx.restore();
}

/** Carga una imagen desde un src local (blob:/data:) como elemento dibujable. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = src;
  });
}
