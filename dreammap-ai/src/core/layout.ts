import type { DocumentFormat, LayoutCell, Rect, VisionBoardCanvas } from './types';
import type { DesignTemplate } from './templates';
import { documentResolution, isPrintCategory } from './formats';

/**
 * MOTOR DE DISTRIBUCIÓN ("Reorganizar para este formato").
 * La distribución se calcula a partir del CONTENIDO + DISEÑO + FORMATO,
 * nunca se guarda en píxeles fijos. Por eso cambiar de 1080×1920 px a
 * 50×70 cm o a un pendón conserva el diseño y lo recompone.
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
  // Zona segura: en impresión, el margen elegido; en digital, 4% del lado corto.
  const safePx = isPrintCategory(format.category)
    ? Math.max(format.safeMm * pxPerMm, shortSide * 0.02)
    : shortSide * 0.045;
  const safe: Rect = { x: trim.x + safePx, y: trim.y + safePx, w: trim.w - safePx * 2, h: trim.h - safePx * 2 };
  // Área de composición: nunca menor que la zona segura; en impresión deja aire de diseño extra.
  const inner = Math.max(safePx, shortSide * (isPrintCategory(format.category) ? 0.04 : 0.045));
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

  const cells = gridCells(grid, dreamIds, gap, template.cellAspect);
  return { canvasW, canvasH, trim, safe, header, headerMode, cells, gap, pxPerMm };
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

/** Área de la imagen dentro de una celda (descuenta el pie de foto si va debajo). */
export function imageRectForCell(cell: Rect, caption: 'overlay' | 'below' | 'none'): { image: Rect; caption: Rect | null } {
  if (caption === 'below') {
    const capH = Math.min(cell.h * 0.2, Math.max(cell.w * 0.14, cell.h * 0.12));
    return { image: { x: cell.x, y: cell.y, w: cell.w, h: cell.h - capH }, caption: { x: cell.x, y: cell.y + cell.h - capH, w: cell.w, h: capH } };
  }
  if (caption === 'overlay') {
    const capH = Math.min(cell.h * 0.28, Math.max(cell.h * 0.16, cell.w * 0.14));
    return { image: cell, caption: { x: cell.x, y: cell.y + cell.h - capH, w: cell.w, h: capH } };
  }
  return { image: cell, caption: null };
}
