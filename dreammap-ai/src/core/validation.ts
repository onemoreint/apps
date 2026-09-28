import type { BoardContent, DocumentFormat, ImageAsset, ImageQualityReport, PrintAlert, PrintValidation, QualityLevel } from './types';
import type { DesignTemplate } from './templates';
import { layoutBoard, imageRectForCell } from './layout';
import { captionFontPx } from './render';
import { describeSize, exportableDpi, isPrintCategory, targetDpi, formatNumber } from './formats';

/** Umbrales de calidad frente al DPI objetivo del formato. */
export function qualityLevel(effectivePpi: number, target: number): QualityLevel {
  if (effectivePpi >= target * 0.85) return 'excelente';
  if (effectivePpi >= Math.max(target * 0.5, 72)) return 'aceptable';
  return 'insuficiente';
}

export const QUALITY_UI: Record<QualityLevel, { dot: string; label: string }> = {
  excelente: { dot: '🟢', label: 'Excelente' },
  aceptable: { dot: '🟡', label: 'Aceptable' },
  insuficiente: { dot: '🔴', label: 'Insuficiente' },
  vector: { dot: '🟢', label: 'Excelente (vectorial)' },
};

/**
 * Calcula la calidad real de cada imagen según el tamaño físico que ocupará.
 * Nunca "sube" artificialmente la resolución: compara píxeles reales vs. necesarios.
 */
export function imageQualities(format: DocumentFormat, t: DesignTemplate, content: BoardContent, assets: Map<string, ImageAsset>): ImageQualityReport[] {
  const layout = layoutBoard(format, t, content.dreams.map((d) => d.id));
  const target = targetDpi(format);
  const out: ImageQualityReport[] = [];
  for (const cell of layout.cells) {
    const dream = content.dreams.find((d) => d.id === cell.dreamId);
    const asset = dream?.imageId ? assets.get(dream.imageId) : undefined;
    if (!dream || !asset) continue;
    if (asset.vector) { out.push({ dreamId: dream.id, effectivePpi: Infinity, level: 'vector' }); continue; }
    const { image } = imageRectForCell(cell.rect, t.card.caption);
    // Tamaño físico de la celda en pulgadas (a la resolución objetivo, pxPerMm incluye dpi).
    const wIn = image.w / layout.pxPerMm / 25.4;
    const hIn = image.h / layout.pxPerMm / 25.4;
    const ppi = Math.min(asset.width / wIn, asset.height / hIn); // relleno tipo "cover"
    out.push({ dreamId: dream.id, effectivePpi: ppi, level: qualityLevel(ppi, target) });
  }
  return out;
}

export function validateBoard(format: DocumentFormat, t: DesignTemplate, content: BoardContent, assets: Map<string, ImageAsset>, maxPixels?: number): PrintValidation {
  const alerts: PrintAlert[] = [];
  const isPrint = isPrintCategory(format.category);
  const size = describeSize(format);
  const images = imageQualities(format, t, content, assets);
  const dreamName = (id: string) => content.dreams.find((d) => d.id === id)?.title || 'sin título';

  if (content.dreams.length === 0) {
    alerts.push({ id: 'no-dreams', severity: 'error', message: 'Agrega al menos un sueño a tu mapa.' });
  }

  for (const r of images) {
    if (r.level === 'insuficiente') {
      alerts.push({
        id: `img-${r.dreamId}`, dreamId: r.dreamId, severity: isPrint ? 'error' : 'warning',
        message: isPrint
          ? `La imagen de «${dreamName(r.dreamId)}» puede perder calidad al imprimirse en ${size}. Usa una foto más grande o genera una con IA.`
          : `La imagen de «${dreamName(r.dreamId)}» se verá borrosa en ${size}.`,
      });
    } else if (r.level === 'aceptable') {
      alerts.push({
        id: `img-${r.dreamId}`, dreamId: r.dreamId, severity: 'info',
        message: `La imagen de «${dreamName(r.dreamId)}» se verá bien a distancia, pero algo suave de cerca.`,
      });
    }
  }

  const missing = content.dreams.filter((d) => !d.imageId).length;
  if (missing > 0) {
    alerts.push({ id: 'missing', severity: 'info', message: missing === 1 ? '1 sueño aún no tiene imagen.' : `${missing} sueños aún no tienen imagen.` });
  }

  if (isPrint) {
    const longCm = Math.max(format.widthMm, format.heightMm) / 10;
    if (format.quality === 'estandar' && format.category !== 'pendon' && longCm < 90) {
      alerts.push({ id: 'dpi-low', severity: 'warning', message: 'La resolución seleccionada no es suficiente para impresión de alta calidad. Elige «Alta» o «Profesional» si lo verás de cerca.' });
    }
    if (format.bleedMm === 0) {
      alerts.push({ id: 'no-bleed', severity: 'info', message: 'Sin sangrado: si la imprenta recorta el papel, podrían quedar bordes blancos. Si lo imprimes en casa, está bien.' });
    }
    if (format.safeMm < 5) {
      alerts.push({ id: 'safe', severity: 'warning', message: 'Este texto está demasiado cerca del borde. Aumenta el margen seguro a 5 mm o más.' });
    }
    const exp = exportableDpi(format, maxPixels);
    if (exp.capped) {
      const ok = exp.dpi >= 150 || (format.category === 'pendon' && exp.dpi >= 100);
      alerts.push({
        id: 'capped', severity: ok ? 'info' : 'warning',
        message: ok
          ? `Por su tamaño, este navegador exportará a ${exp.dpi} DPI. Es suficiente para un formato que se mira a distancia.`
          : `Este navegador solo puede exportar este tamaño a ${exp.dpi} DPI. Para máxima calidad, exporta desde un computador de escritorio.`,
      });
    }
  }

  // Tamaño físico del texto de los sueños
  const layout = layoutBoard(format, t, content.dreams.map((d) => d.id));
  const firstCell = layout.cells[0];
  if (firstCell && t.card.caption !== 'none') {
    const cap = imageRectForCell(firstCell.rect, t.card.caption).caption;
    if (cap) {
      const px = captionFontPx(cap);
      if (isPrint) {
        const mm = px / layout.pxPerMm;
        if (mm < 2.2) alerts.push({ id: 'text-small', severity: 'warning', message: `Los textos de los sueños quedarán muy pequeños (${formatNumber(mm)} mm). Usa menos sueños o un formato más grande.` });
      } else if (px < 16) {
        alerts.push({ id: 'text-small', severity: 'warning', message: 'Los textos de los sueños serán difíciles de leer en pantalla. Usa menos sueños.' });
      }
    }
  }

  const ready = !alerts.some((a) => a.severity === 'error');
  if (ready && !alerts.some((a) => a.severity === 'warning')) {
    alerts.push({ id: 'ready', severity: 'ok', message: isPrint ? 'Tu diseño está preparado para impresión.' : 'Tu diseño está listo para pantalla.' });
  }
  return { ready, alerts, images };
}
