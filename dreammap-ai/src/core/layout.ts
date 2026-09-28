import type { DocumentFormat, LayoutCell, Rect, VisionBoardCanvas } from './types';
import type { DesignTemplate } from './templates';
import { documentResolution, isPrintCategory } from './formats';

/**
 * MOTOR DE DISTRIBUCIÓN ("Reorganizar para este formato").
 * La distribución se calcula a partir del CONTENIDO + DISEÑO + FORMATO,
 * nunca se guarda en píxeles fijos. Por eso cambiar de 1080×1920 px a
 * 50×70 cm o a un pendón conserva el diseño y lo recompone.
 *
 * Distribuciones: cuadrícula, bento (foto protagonista), collage (fotos
 * inclinadas y superpuestas) y mosaico tipo Pinterest (columnas de alturas
 * variables). Todas quedan dentro de la zona segura.
 *
 * @param scale factor sobre la resolución objetivo del documento (1 = exportación).
 */
export function layoutBoard(
  format: DocumentFormat,
  template: DesignTemplate,
  dreamIds: string[],
  scale = 1,
  dpiOverride?: number,
): VisionBoardCanvas {
  const res = documentResolution(format, dpiOverride);
  const canvasW = res.totalPxW * scale;
  const canvasH = res.totalPxH * scale;
  const bleed = res.bleedPx * scale;
  const trim: Rect = { x: bleed, y: bleed, w: res.trimPxW * scale, h: res.trimPxH * scale };
  const pxPerMm = trim.w / format.widthMm;

  const shortSide = Math.min(trim.w, trim.h);
  // Zona segura: en impresión, el margen elegido; en digital, 4,5 % del lado corto.
  const safePx = isPrintCategory(format.category)
    ? Math.max(format.safeMm * pxPerMm, shortSide * 0.02)
    : shortSide * 0.045;
  const safe: Rect = { x: trim.x + safePx, y: trim.y + safePx, w: trim.w - safePx * 2, h: trim.h - safePx * 2 };
  // Área de composición: nunca menor que la zona segura; más aire si la plantilla lo pide.
  const inner = Math.max(safePx, shortSide * (isPrintCategory(format.category) ? 0.04 : 0.045)) + shortSide * (template.extraPad ?? 0);
  const area: Rect = { x: trim.x + inner, y: trim.y + inner, w: trim.w - inner * 2, h: trim.h - inner * 2 };

  const gap = Math.max(1, Math.min(area.w, area.h) * template.gapFrac);
  const aspect = trim.w / trim.h;
  const headerMode: 'top' | 'side' = aspect > 1.45 ? 'side' : 'top';

  let header: Rect;
  let grid: Rect;
  if (headerMode === 'side') {
    const hw = area.w * (aspect > 2.2 ? 0.22 : 0.28);
    header = { x: area.x, y: area.y, w: hw, h: area.h };
    grid = { x: area.x + hw + gap * 1.5, y: area.y, w: area.w - hw - gap * 1.5, h: area.h };
  } else {
    // Pendones muy altos: cabecera proporcionalmente más baja pero legible.
    const frac = aspect < 0.5 ? 0.11 : aspect < 0.7 ? 0.15 : 0.17;
    const hh = area.h * frac;
    header = { x: area.x, y: area.y, w: area.w, h: hh };
    grid = { x: area.x, y: area.y + hh + gap, w: area.w, h: area.h - hh - gap };
  }

  let cells: LayoutCell[];
  switch (template.layout) {
    case 'bento': cells = bentoCells(grid, dreamIds, gap, template.cellAspect); break;
    case 'masonry': cells = masonryCells(grid, dreamIds, gap, template.cellAspect); break;
    case 'collage': cells = collageCells(grid, dreamIds, gap, template.cellAspect, template.tilt ?? 4); break;
    default: cells = gridCells(grid, dreamIds, gap, template.cellAspect);
  }
  return { canvasW, canvasH, trim, safe, area, header, headerMode, cells, gap, pxPerMm };
}

/** Generador pseudoaleatorio estable a partir de un texto (mismo sueño → misma inclinación). */
export function seeded(text: string) {
  let s = 2166136261;
  for (let i = 0; i < text.length; i++) s = Math.imul(s ^ text.charCodeAt(i), 16777619) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function bestGrid(n: number, W: number, H: number, gap: number, targetAspect: number): { cols: number; rows: number } {
  if (n <= 0) return { cols: 1, rows: 1 };
  let best = { cols: 1, rows: n, score: Infinity };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cw = (W - gap * (cols - 1)) / cols;
    const ch = (H - gap * (rows - 1)) / rows;
    if (cw <= 0 || ch <= 0) continue;
    const lastRow = n - cols * (rows - 1);
    const aspectScore = Math.abs(Math.log(cw / ch / targetAspect));
    // La última fila se estira; penaliza que sus celdas queden muy distintas al resto.
    const lastW = (W - gap * (lastRow - 1)) / lastRow;
    const unevenScore = Math.abs(Math.log(lastW / cw)) * 0.35;
    const score = aspectScore + unevenScore;
    if (score < best.score - 1e-9) best = { cols, rows, score };
  }
  return { cols: best.cols, rows: best.rows };
}

function gridCells(grid: Rect, ids: string[], gap: number, targetAspect: number): LayoutCell[] {
  const n = ids.length;
  if (n === 0) return [];
  const { cols, rows } = bestGrid(n, grid.w, grid.h, gap, targetAspect);
  const ch = (grid.h - gap * (rows - 1)) / rows;
  const cells: LayoutCell[] = [];
  let i = 0;
  for (let r = 0; r < rows; r++) {
    const inRow = r === rows - 1 ? n - cols * (rows - 1) : cols;
    const cw = (grid.w - gap * (inRow - 1)) / inRow;
    for (let c = 0; c < inRow; c++) {
      cells.push({ dreamId: ids[i++], rect: { x: grid.x + c * (cw + gap), y: grid.y + r * (ch + gap), w: cw, h: ch } });
    }
  }
  return cells;
}

/** Bento editorial: el primer sueño es protagonista y el resto se reparte a su lado. */
function bentoCells(grid: Rect, ids: string[], gap: number, targetAspect: number): LayoutCell[] {
  if (ids.length <= 2) return gridCells(grid, ids, gap, targetAspect);
  const [hero, ...rest] = ids;
  const landscape = grid.w / grid.h > 1.15;
  if (landscape) {
    const hw = (grid.w - gap) * (rest.length > 4 ? 0.44 : 0.5);
    return [
      { dreamId: hero, rect: { x: grid.x, y: grid.y, w: hw, h: grid.h } },
      ...gridCells({ x: grid.x + hw + gap, y: grid.y, w: grid.w - hw - gap, h: grid.h }, rest, gap, targetAspect),
    ];
  }
  const hh = (grid.h - gap) * (rest.length > 4 ? 0.42 : 0.5);
  return [
    { dreamId: hero, rect: { x: grid.x, y: grid.y, w: grid.w, h: hh } },
    ...gridCells({ x: grid.x, y: grid.y + hh + gap, w: grid.w, h: grid.h - hh - gap }, rest, gap, targetAspect),
  ];
}

/** Mosaico tipo Pinterest: columnas con alturas alternadas que llenan todo el alto. */
function masonryCells(grid: Rect, ids: string[], gap: number, targetAspect: number): LayoutCell[] {
  const n = ids.length;
  if (n <= 2) return gridCells(grid, ids, gap, targetAspect);
  let { cols } = bestGrid(n, grid.w, grid.h, gap, targetAspect);
  cols = Math.max(2, Math.min(cols, n - 1));
  const columns: string[][] = Array.from({ length: cols }, () => []);
  ids.forEach((id, i) => columns[i % cols].push(id));
  const cw = (grid.w - gap * (cols - 1)) / cols;
  const PATTERN = [1.28, 0.82, 1.1, 0.9, 1.2, 0.86];
  const cells: LayoutCell[] = [];
  // Recorre por filas para conservar el orden de lectura.
  const tops = new Array(cols).fill(grid.y);
  const heights = columns.map((col, c) => {
    const w = col.map((_, k) => PATTERN[(k + c * 3) % PATTERN.length]);
    const sum = w.reduce((a, b) => a + b, 0);
    const avail = grid.h - gap * (col.length - 1);
    return w.map((x) => (x / sum) * avail);
  });
  const maxLen = Math.max(...columns.map((c) => c.length));
  for (let k = 0; k < maxLen; k++) {
    for (let c = 0; c < cols; c++) {
      const id = columns[c][k];
      if (!id) continue;
      const h = heights[c][k];
      cells.push({ dreamId: id, rect: { x: grid.x + c * (cw + gap), y: tops[c], w: cw, h } });
      tops[c] += h + gap;
    }
  }
  return cells;
}

/** Collage: fotos algo más pequeñas, desplazadas e inclinadas, siempre dentro del área. */
function collageCells(grid: Rect, ids: string[], gap: number, targetAspect: number, tiltDeg: number): LayoutCell[] {
  const base = gridCells(grid, ids, gap * 0.4, targetAspect);
  return base.map((cell) => {
    const rnd = seeded(cell.dreamId);
    const rotation = ((rnd() - 0.5) * 2 * tiltDeg * Math.PI) / 180;
    const s = 0.92 + rnd() * 0.06;
    const w = cell.rect.w * s;
    const h = cell.rect.h * s;
    let cx = cell.rect.x + cell.rect.w / 2 + (rnd() - 0.5) * cell.rect.w * 0.08;
    let cy = cell.rect.y + cell.rect.h / 2 + (rnd() - 0.5) * cell.rect.h * 0.08;
    // Mantiene la caja girada completa dentro del área de fotos.
    const c = Math.abs(Math.cos(rotation)), sn = Math.abs(Math.sin(rotation));
    const bw = (w * c + h * sn) / 2, bh = (w * sn + h * c) / 2;
    let scale = 1;
    if (bw * 2 > grid.w || bh * 2 > grid.h) scale = Math.min(grid.w / (bw * 2), grid.h / (bh * 2));
    const hw = bw * scale, hh = bh * scale;
    cx = Math.min(Math.max(cx, grid.x + hw), grid.x + grid.w - hw);
    cy = Math.min(Math.max(cy, grid.y + hh), grid.y + grid.h - hh);
    const W = w * scale, H = h * scale;
    return { dreamId: cell.dreamId, rotation, rect: { x: cx - W / 2, y: cy - H / 2, w: W, h: H } };
  });
}

/**
 * Área de la foto y del pie dentro de una celda, según la forma de la plantilla.
 * Las coordenadas son las de la celda sin girar.
 */
export function imageRectForCell(cell: Rect, t: Pick<DesignTemplate, 'card'>): { image: Rect; caption: Rect | null; frame: Rect | null } {
  const { shape, caption } = t.card;
  const short = Math.min(cell.w, cell.h);

  if (shape === 'frame') {
    const pad = short * (t.card.framePad ?? 0.05);
    const capH = caption === 'inside' ? cell.h * (t.card.captionFrac ?? 0.18) : 0;
    const image = { x: cell.x + pad, y: cell.y + pad, w: cell.w - pad * 2, h: cell.h - pad - (capH > 0 ? capH : pad) };
    return { image, caption: capH > 0 ? { x: cell.x + pad, y: cell.y + cell.h - capH, w: cell.w - pad * 2, h: capH } : null, frame: cell };
  }
  if (shape === 'film') {
    const band = Math.min(cell.w * 0.1, cell.h * 0.12);
    const image = { x: cell.x + band, y: cell.y + band * 0.45, w: cell.w - band * 2, h: cell.h - band * 0.9 };
    return { image, caption: caption === 'none' ? null : overlayCaption(image), frame: cell };
  }
  if (shape === 'circle') {
    const capH = caption === 'below' ? Math.min(cell.h * 0.2, Math.max(cell.w * 0.16, cell.h * 0.12)) : 0;
    const d = Math.min(cell.w, cell.h - capH);
    const image = { x: cell.x + (cell.w - d) / 2, y: cell.y + (cell.h - capH - d) / 2, w: d, h: d };
    const cap = caption === 'below' ? { x: cell.x, y: image.y + d, w: cell.w, h: capH } : caption === 'overlay' ? overlayCaption(image) : null;
    return { image, caption: cap, frame: null };
  }
  if (caption === 'below') {
    const capH = Math.min(cell.h * 0.2, Math.max(cell.w * 0.14, cell.h * 0.12));
    return { image: { x: cell.x, y: cell.y, w: cell.w, h: cell.h - capH }, caption: { x: cell.x, y: cell.y + cell.h - capH, w: cell.w, h: capH }, frame: null };
  }
  if (caption === 'overlay') return { image: cell, caption: overlayCaption(cell), frame: null };
  return { image: cell, caption: null, frame: null };
}

function overlayCaption(r: Rect): Rect {
  const capH = Math.min(r.h * 0.28, Math.max(r.h * 0.16, r.w * 0.14));
  return { x: r.x, y: r.y + r.h - capH, w: r.w, h: capH };
}
