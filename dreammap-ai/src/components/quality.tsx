import type { ImageAsset, QualityLevel } from '../core/types';
import type { Project } from '../store';
import { getTemplate } from '../core/templates';
import { layoutBoard, imageRectForCell } from '../core/layout';
import { isPrintCategory, targetDpi, aspectRatioLabel, formatNumber } from '../core/formats';
import { qualityLevel, QUALITY_UI } from '../core/validation';

export type CandidateQuality = {
  level: QualityLevel;
  ppi: number;
  /** Tamaño que ocupará la imagen en el mapa. */
  sizeLabel: string;
  neededPx: string;
};

/** Calidad de una imagen (candidata o actual) en la celda de un sueño concreto. */
export function candidateQuality(project: Project, dreamId: string, asset: Pick<ImageAsset, 'width' | 'height' | 'vector'>): CandidateQuality | null {
  const t = getTemplate(project.templateId);
  const L = layoutBoard(project.format, t, project.content.dreams.map((d) => d.id));
  const cell = L.cells.find((c) => c.dreamId === dreamId);
  if (!cell) return null;
  const { image } = imageRectForCell(cell.rect, t.card.caption);
  const print = isPrintCategory(project.format.category);
  const wMm = image.w / L.pxPerMm, hMm = image.h / L.pxPerMm;
  const sizeLabel = print ? `${formatNumber(wMm / 10)} × ${formatNumber(hMm / 10)} cm` : `${Math.round(image.w)} × ${Math.round(image.h)} px`;
  const neededPx = `${Math.round(image.w).toLocaleString('es-CO')} × ${Math.round(image.h).toLocaleString('es-CO')} px`;
  if (asset.vector) return { level: 'vector', ppi: Infinity, sizeLabel, neededPx };
  const ppi = Math.min(asset.width / (wMm / 25.4), asset.height / (hMm / 25.4));
  return { level: qualityLevel(ppi, targetDpi(project.format)), ppi, sizeLabel, neededPx };
}

export function QualityBadge({ q }: { q: CandidateQuality | null }) {
  if (!q) return null;
  const ui = QUALITY_UI[q.level];
  return <span className={`quality-badge ${q.level}`}>{ui.dot} {ui.label}</span>;
}

export function ImageSpecs({ asset, q, print }: { asset: ImageAsset | { width: number; height: number; vector?: boolean }; q: CandidateQuality | null; print: boolean }) {
  return (
    <dl className="spec">
      <dt>Resolución</dt>
      <dd>{asset.vector ? 'Vectorial' : `${formatNumber((asset.width * asset.height) / 1e6, 1)} MP`}</dd>
      <dt>Dimensiones</dt>
      <dd>{asset.vector ? 'Sin límite' : `${asset.width.toLocaleString('es-CO')} × ${asset.height.toLocaleString('es-CO')} px`}</dd>
      <dt>Relación de aspecto</dt>
      <dd>{aspectRatioLabel(asset.width, asset.height)}</dd>
      {q && (
        <>
          <dt>Ocupa en el mapa</dt>
          <dd>{q.sizeLabel}</dd>
          {print && !asset.vector && (
            <>
              <dt>Nitidez al imprimir</dt>
              <dd>{Math.round(q.ppi)} DPI</dd>
            </>
          )}
          {!print && !asset.vector && (
            <>
              <dt>Necesita</dt>
              <dd>{q.neededPx}</dd>
            </>
          )}
        </>
      )}
    </dl>
  );
}
