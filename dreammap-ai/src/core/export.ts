import type { BoardContent, DocumentFormat, ExportFileType, ExportSettings, ImageAsset } from './types';
import type { DesignTemplate } from './templates';
import { documentResolution, exportableDpi, isPrintCategory, maxCanvasPixels } from './formats';
import { layoutBoard } from './layout';
import { renderBoard, loadImage, type Drawable } from './render';

export function buildExportSettings(format: DocumentFormat, fileType: ExportFileType, includeBleed = true, maxPixels = maxCanvasPixels()): ExportSettings {
  const print = isPrintCategory(format.category);
  const { dpi, capped } = print ? exportableDpi(format, maxPixels) : { dpi: 96, capped: false };
  const res = documentResolution(format, print ? dpi : undefined);
  const bleed = print && includeBleed && format.bleedMm > 0;
  return {
    fileType,
    jpgQuality: 0.92,
    includeBleed: bleed,
    dpi,
    requestedDpi: print ? documentResolution(format).dpi : 96,
    capped,
    pixelWidth: bleed ? res.totalPxW : res.trimPxW,
    pixelHeight: bleed ? res.totalPxH : res.trimPxH,
  };
}

export async function loadAll(assets: ImageAsset[]): Promise<Map<string, Drawable>> {
  const map = new Map<string, Drawable>();
  await Promise.all(
    assets.map(async (a) => {
      try { map.set(a.id, await loadImage(a.src)); } catch { /* se dibuja marcador */ }
    }),
  );
  return map;
}

/** Renderiza el mapa a su resolución final. */
export async function renderForExport(format: DocumentFormat, template: DesignTemplate, content: BoardContent, assets: ImageAsset[], settings: ExportSettings): Promise<HTMLCanvasElement> {
  await document.fonts?.ready;
  const print = isPrintCategory(format.category);
  const layout = layoutBoard(format, template, content.dreams.map((d) => d.id), 1, print ? settings.dpi : undefined);
  const images = await loadAll(assets);
  const full = document.createElement('canvas');
  full.width = Math.round(layout.canvasW);
  full.height = Math.round(layout.canvasH);
  const ctx = full.getContext('2d');
  if (!ctx) throw new Error('El navegador no tiene memoria suficiente para este tamaño.');
  ctx.imageSmoothingQuality = 'high';
  renderBoard(ctx, layout, template, content, images, { showGuides: false });
  if (settings.includeBleed || layout.trim.x < 0.5) return full;
  // Recorta al tamaño final (sin sangrado).
  const c = document.createElement('canvas');
  c.width = Math.round(layout.trim.w);
  c.height = Math.round(layout.trim.h);
  c.getContext('2d')!.drawImage(full, layout.trim.x, layout.trim.y, layout.trim.w, layout.trim.h, 0, 0, c.width, c.height);
  full.width = 0; full.height = 0; // libera memoria
  return c;
}

function canvasToBlob(c: HTMLCanvasElement, type: string, q?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar el archivo (memoria insuficiente). Prueba una calidad menor.'))), type, q),
  );
}

export async function exportBoard(format: DocumentFormat, template: DesignTemplate, content: BoardContent, assets: ImageAsset[], settings: ExportSettings): Promise<{ blob: Blob; filename: string }> {
  const canvas = await renderForExport(format, template, content, assets, settings);
  const safeName = (content.projectName || 'mapa-de-suenos').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const sizeTag = isPrintCategory(format.category) ? `${Math.round(format.widthMm / 10)}x${Math.round(format.heightMm / 10)}cm-${settings.dpi}dpi` : `${canvas.width}x${canvas.height}`;
  const base = `${safeName}-${sizeTag}`;

  if (settings.fileType === 'pdf') {
    const { jsPDF } = await import('jspdf');
    const bleed = settings.includeBleed ? format.bleedMm : 0;
    const wMm = format.widthMm + bleed * 2;
    const hMm = format.heightMm + bleed * 2;
    const pdf = new jsPDF({ unit: 'mm', format: [wMm, hMm], orientation: wMm > hMm ? 'landscape' : 'portrait', compress: true });
    const jpg = await canvasToBlob(canvas, 'image/jpeg', 0.95);
    const bytes = new Uint8Array(await jpg.arrayBuffer());
    pdf.addImage(bytes, 'JPEG', 0, 0, wMm, hMm, undefined, 'NONE');
    pdf.setProperties({ title: content.title, subject: `Mapa de sueños ${wMm.toFixed(1)}×${hMm.toFixed(1)} mm`, creator: 'DREAMMAP AI' });
    return { blob: pdf.output('blob'), filename: `${base}.pdf` };
  }
  const type = settings.fileType === 'jpg' ? 'image/jpeg' : 'image/png';
  const blob = await canvasToBlob(canvas, type, settings.fileType === 'jpg' ? settings.jpgQuality : undefined);
  const final = settings.fileType === 'png' && isPrintCategory(format.category) ? await setPngDpi(blob, settings.dpi) : blob;
  return { blob: final, filename: `${base}.${settings.fileType}` };
}

/** Escribe el chunk pHYs para que el PNG declare su DPI real (lo leen imprentas y editores). */
export async function setPngDpi(png: Blob, dpi: number): Promise<Blob> {
  const buf = new Uint8Array(await png.arrayBuffer());
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  dv.setUint32(8, ppm);
  dv.setUint32(12, ppm);
  chunk[16] = 1; // metros
  dv.setUint32(17, crc32(chunk.subarray(4, 17)));
  // Inserta justo después del IHDR (8 bytes firma + 25 bytes IHDR)
  const at = 33;
  const out = new Uint8Array(buf.length + chunk.length);
  out.set(buf.subarray(0, at), 0);
  out.set(chunk, at);
  out.set(buf.subarray(at), at + chunk.length);
  return new Blob([out], { type: 'image/png' });
}

let CRC_TABLE: Uint32Array | null = null;
function crc32(data: Uint8Array): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const b of data) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

type Downloads = { save(r: { filename: string; data: Blob }): Promise<{ status: string }> };
type ClaudeHost = { use?: (name: string) => Promise<unknown> };

/**
 * Entrega el archivo. Dentro de claude.ai usa la capacidad `downloads`
 * (el visor confirma la descarga); fuera de ella, una descarga normal.
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<'saved' | 'declined'> {
  const host = (window as unknown as { claude?: ClaudeHost }).claude;
  if (host?.use) {
    const downloads = (await host.use('downloads').catch(() => null)) as Downloads | null;
    if (downloads) {
      try {
        await downloads.save({ filename, data: blob });
        return 'saved';
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (code === 'declined') return 'declined';
        throw new Error(code === 'too_large' ? 'El archivo es demasiado grande para este visor. Prueba JPG o una calidad menor.' : 'No se pudo guardar el archivo en esta vista.');
      }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'saved';
}
