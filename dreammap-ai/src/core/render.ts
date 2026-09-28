import type { BoardContent, Rect, VisionBoardCanvas, Dream } from './types';
import type { DesignTemplate } from './templates';
import { imageRectForCell } from './layout';

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

export function captionFontPx(caption: Rect): number {
  return Math.max(4, Math.min(caption.h * 0.36, caption.w * 0.075));
}
export function titleFontPx(layout: VisionBoardCanvas): number {
  const h = layout.header;
  return layout.headerMode === 'side' ? Math.min(h.w * 0.16, h.h * 0.09) : Math.min(h.h * 0.4, h.w * 0.085);
}

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

function paintBackground(ctx: CanvasRenderingContext2D, t: DesignTemplate, w: number, h: number) {
  if (t.background.type === 'solid') {
    ctx.fillStyle = t.background.color;
  } else {
    const a = (t.background.angle * Math.PI) / 180;
    const cx = w / 2, cy = h / 2;
    const len = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
    const dx = (Math.sin(a) * len) / 2, dy = (-Math.cos(a) * len) / 2;
    const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    g.addColorStop(0, t.background.from);
    g.addColorStop(1, t.background.to);
    ctx.fillStyle = g;
  }
  ctx.fillRect(0, 0, w, h);
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

function drawPlaceholder(ctx: CanvasRenderingContext2D, r: Rect, t: DesignTemplate, dream: Dream, editor: boolean) {
  const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  g.addColorStop(0, hexA(t.accent, 0.28));
  g.addColorStop(1, hexA(t.accent, 0.08));
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

function hexA(color: string, a: number) {
  if (!color.startsWith('#')) return color;
  const h = color.length === 4 ? color.slice(1).split('').map((c) => c + c).join('') : color.slice(1, 7);
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function renderBoard(
  ctx: CanvasRenderingContext2D,
  layout: VisionBoardCanvas,
  t: DesignTemplate,
  content: BoardContent,
  images: Map<string, Drawable>,
  opts: RenderOptions = {},
) {
  const { canvasW, canvasH, header, cells } = layout;
  ctx.save();
  ctx.clearRect(0, 0, canvasW, canvasH);
  paintBackground(ctx, t, canvasW, canvasH);
  const unit = Math.min(layout.trim.w, layout.trim.h);

  // Ornamentos
  if (t.ornament === 'dots') {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    const step = unit * 0.05;
    for (let y = layout.trim.y; y < layout.trim.y + layout.trim.h; y += step)
      for (let x = layout.trim.x; x < layout.trim.x + layout.trim.w; x += step) {
        ctx.beginPath(); ctx.arc(x, y, unit * 0.003, 0, Math.PI * 2); ctx.fill();
      }
  }

  // Cabecera
  const tf = (px: number) => `${t.titleWeight} ${px}px "${t.titleFont}", serif`;
  const title = t.titleUppercase ? content.title.toUpperCase() : content.title;
  const tpx = titleFontPx(layout);
  ctx.textBaseline = 'alphabetic';
  const alignCenter = t.headerAlign === 'center' && layout.headerMode === 'top';
  ctx.textAlign = alignCenter ? 'center' : 'left';
  const tx = alignCenter ? header.x + header.w / 2 : header.x;
  // Ajusta el título al ancho y también al alto disponible de la cabecera.
  // El espaciado entre letras se aplica antes de medir para que el ajuste sea exacto.
  ctx.letterSpacing = t.titleUppercase ? `${tpx * 0.06}px` : '0px';
  let titleFit = fitText(ctx, title, header.w, tpx, tf, layout.headerMode === 'side' ? 4 : 2, tpx * 0.4);
  const blockOf = (px: number, n: number) => px * 1.12 * n + (content.subtitle ? px * 0.34 * 2.1 : 0) + px * 0.25;
  let guard = 0;
  while (blockOf(titleFit.px, titleFit.lines.length) > header.h * 0.94 && guard++ < 12) {
    titleFit = fitText(ctx, title, header.w, titleFit.px * 0.9, tf, layout.headerMode === 'side' ? 4 : 2, titleFit.px * 0.9);
  }
  if (t.titleUppercase) ctx.letterSpacing = `${titleFit.px * 0.06}px`;
  ctx.fillStyle = t.titleColor;
  ctx.font = tf(titleFit.px);
  const lineH = titleFit.px * 1.12;
  const subPx = titleFit.px * 0.34;
  const blockH = blockOf(titleFit.px, titleFit.lines.length);
  let y = layout.headerMode === 'side' ? header.y + header.h * 0.08 + titleFit.px : header.y + (header.h - blockH) / 2 + titleFit.px * 0.95;
  let textBottom = y;
  for (const l of titleFit.lines) { ctx.fillText(l, tx, y); textBottom = y + titleFit.px * 0.25; y += lineH; }
  ctx.letterSpacing = '0px';
  if (content.subtitle) {
    ctx.fillStyle = t.subtitleColor;
    const sf = (px: number) => `500 ${px}px "${t.bodyFont}", sans-serif`;
    const subFit = fitText(ctx, content.subtitle, header.w, subPx, sf, layout.headerMode === 'side' ? 5 : 2, subPx * 0.5);
    ctx.font = sf(subFit.px);
    y += subFit.px * 0.35;
    for (const l of subFit.lines) { ctx.fillText(l, tx, y); textBottom = y + subFit.px * 0.3; y += subFit.px * 1.3; }
  }
  if (t.ornament === 'lines') {
    ctx.strokeStyle = t.accent;
    ctx.lineWidth = Math.max(1, unit * 0.0015);
    ctx.beginPath();
    if (layout.headerMode === 'top') {
      const ly = Math.min(header.y + header.h - 1, textBottom + subPx * 0.9);
      const lw = alignCenter ? header.w * 0.3 : header.w * 0.18;
      const lx = alignCenter ? header.x + (header.w - lw) / 2 : header.x;
      ctx.moveTo(lx, ly); ctx.lineTo(lx + lw, ly);
    } else {
      ctx.moveTo(header.x, textBottom + subPx); ctx.lineTo(header.x + header.w * 0.4, textBottom + subPx);
    }
    ctx.stroke();
  }

  // Celdas
  const dreamsById = new Map(content.dreams.map((d) => [d.id, d]));
  for (const cell of cells) {
    const dream = dreamsById.get(cell.dreamId);
    if (!dream) continue;
    const { image: ir, caption: cr } = imageRectForCell(cell.rect, t.card.caption);
    const radius = t.card.radius * Math.min(ir.w, ir.h);
    ctx.save();
    if (t.card.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.28)';
      ctx.shadowBlur = unit * 0.02;
      ctx.shadowOffsetY = unit * 0.006;
      roundRect(ctx, ir, radius);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fill();
      ctx.shadowColor = 'transparent';
    }
    roundRect(ctx, ir, radius);
    ctx.clip();
    const asset = dream.imageId ? images.get(dream.imageId) : undefined;
    if (asset) drawCover(ctx, asset, ir, dream.focusX, dream.focusY);
    else drawPlaceholder(ctx, ir, t, dream, !!opts.editor);

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
      roundRect(ctx, ir, radius);
      ctx.stroke();
    }

    if (cr && dream.title) {
      const cpx = captionFontPx(cr);
      const cf = (px: number) => `600 ${px}px "${t.card.captionFont}", sans-serif`;
      const pad = cr.w * 0.06;
      const fit = fitText(ctx, dream.title, cr.w - pad * 2, cpx, cf, 2, cpx * 0.6);
      ctx.font = cf(fit.px);
      ctx.fillStyle = t.card.captionColor;
      ctx.textAlign = t.card.caption === 'below' && t.headerAlign === 'left' ? 'left' : 'center';
      const cx = ctx.textAlign === 'left' ? cr.x + (t.card.caption === 'below' ? 0 : pad) : cr.x + cr.w / 2;
      const lh = fit.px * 1.15;
      let cy = t.card.caption === 'overlay'
        ? cr.y + cr.h - pad * 0.6 - lh * (fit.lines.length - 1)
        : cr.y + (cr.h - lh * fit.lines.length) / 2 + fit.px * 0.9;
      for (const l of fit.lines) { ctx.fillText(l, cx, cy); cy += lh; }
    }

    if (opts.selectedDreamId === dream.id) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = Math.max(2, unit * 0.006);
      ctx.setLineDash([]);
      roundRect(ctx, cell.rect, radius);
      ctx.stroke();
    }
  }

  if (opts.showGuides) drawGuides(ctx, layout);
  ctx.restore();
}

export function drawGuides(ctx: CanvasRenderingContext2D, layout: VisionBoardCanvas) {
  const { trim, safe, canvasW, canvasH } = layout;
  const lw = Math.max(1, Math.min(canvasW, canvasH) * 0.002);
  ctx.save();
  // Sangrado: zona que se corta
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
