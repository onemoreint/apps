import { useEffect, useRef } from 'react';
import type { ImageAsset } from '../core/types';
import type { Project } from '../store';
import { getTemplate } from '../core/templates';
import { layoutBoard } from '../core/layout';
import { renderBoard } from '../core/render';
import { documentResolution } from '../core/formats';
import { useImageMap, useSize } from './board';

export function BoardPreview(props: {
  project: Project;
  assetMap: Map<string, ImageAsset>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onOpenPicker: (id: string) => void;
}) {
  const { project, assetMap, selectedId, onSelect, onOpenPicker } = props;
  const [wrapRef, size] = useSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const images = useImageMap(project.content, assetMap);
  const layoutRef = useRef<ReturnType<typeof layoutBoard> | null>(null);
  const dprRef = useRef(1);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const t = getTemplate(project.templateId);
    const res = documentResolution(project.format);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    dprRef.current = dpr;
    const availW = Math.max(120, size.w - 48);
    const availH = Math.max(120, size.h - 48);
    const s = Math.min(availW / res.totalPxW, availH / res.totalPxH);
    const L = layoutBoard(project.format, t, project.content.dreams.map((d) => d.id), s * dpr);
    layoutRef.current = L;
    c.width = Math.round(L.canvasW);
    c.height = Math.round(L.canvasH);
    c.style.width = `${L.canvasW / dpr}px`;
    c.style.height = `${L.canvasH / dpr}px`;
    renderBoard(c.getContext('2d')!, L, t, project.content, images, {
      showGuides: project.format.showGuides,
      selectedDreamId: selectedId,
      editor: true,
    });
  }, [project, images, size, selectedId]);

  const hit = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const L = layoutRef.current;
    if (!L) return null;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) * dprRef.current;
    const y = (e.clientY - r.top) * dprRef.current;
    return L.cells.find((c) => x >= c.rect.x && x <= c.rect.x + c.rect.w && y >= c.rect.y && y <= c.rect.y + c.rect.h) ?? null;
  };

  return (
    <div className="canvas-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="board-canvas"
        role="img"
        aria-label={`Vista previa del mapa: ${project.content.title}`}
        onClick={(e) => {
          const cell = hit(e);
          if (!cell) return onSelect(null);
          const dream = project.content.dreams.find((d) => d.id === cell.dreamId);
          onSelect(cell.dreamId);
          if (dream && !dream.imageId) onOpenPicker(cell.dreamId);
        }}
        onDoubleClick={(e) => {
          const cell = hit(e);
          if (cell) onOpenPicker(cell.dreamId);
        }}
      />
    </div>
  );
}
