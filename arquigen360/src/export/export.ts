import { jsPDF } from 'jspdf';

type DownloadsNS = { save: (r: { filename: string; data: Blob | string }) => Promise<unknown> };
type ClaudeRuntime = { use: (name: string) => Promise<unknown> };

/** Entrega un archivo: usa la capacidad de descargas del visor si existe; si no, un enlace normal. */
export async function saveFile(filename: string, data: Blob): Promise<'saved' | 'declined'> {
  const rt = (window as unknown as { claude?: ClaudeRuntime }).claude;
  if (rt?.use) {
    const dl = (await rt.use('downloads').catch(() => null)) as DownloadsNS | null;
    if (dl) {
      try {
        await dl.save({ filename, data });
        return 'saved';
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code === 'declined' || code === 'rate_limited') return 'declined';
        // otros errores: intentar descarga normal
      }
    }
  }
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'saved';
}

export function serializeSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.removeAttribute('class');
  clone.removeAttribute('style');
  const vb = svg.viewBox.baseVal;
  clone.setAttribute('width', `${vb.width}mm`);
  clone.setAttribute('height', `${vb.height}mm`);
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
}

export async function rasterize(svg: SVGSVGElement, pxWidth: number, mime: 'image/png' | 'image/jpeg'): Promise<Blob> {
  const text = serializeSvg(svg);
  const vb = svg.viewBox.baseVal;
  const w = pxWidth;
  const h = Math.round((pxWidth * vb.height) / vb.width);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('No se pudo rasterizar el plano.'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Canvas vacío'))), mime, 0.93));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function toPdf(svg: SVGSVGElement): Promise<Blob> {
  const png = await rasterize(svg, 4200, 'image/png');
  const dataUrl = await new Promise<string>((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.readAsDataURL(png);
  });
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  pdf.addImage(dataUrl, 'PNG', 0, 0, 420, 297);
  return pdf.output('blob');
}

export type ExportFormat = 'png' | 'jpg' | 'pdf' | 'svg' | 'json';

export const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'proyecto';
