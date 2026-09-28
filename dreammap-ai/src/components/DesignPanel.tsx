import type { DocumentFormat, ImageAsset } from '../core/types';
import type { Project } from '../store';
import { TEMPLATES } from '../core/templates';
import { FORMAT_CATALOG, formatFromCatalog } from '../core/formats';
import { BoardThumb } from './board';

const VERSIONS: { id: string; label: string }[] = [
  { id: 'dig-wallpaper', label: 'Móvil' },
  { id: 'dig-ig-vertical', label: 'Instagram' },
  { id: 'imp-a4', label: 'A4' },
  { id: 'imp-a3', label: 'A3' },
  { id: 'pos-50x70', label: '50 × 70 cm' },
  { id: 'pen-80x200', label: 'Pendón 80 × 200' },
  { id: 'dig-4k', label: 'Pantalla 4K' },
];

export function DesignPanel({ project, assetMap, setTemplate, setFormat }: {
  project: Project; assetMap: Map<string, ImageAsset>; setTemplate: (id: string) => void; setFormat: (f: DocumentFormat) => void;
}) {
  return (
    <>
      <div className="section">
        <h3>Plantilla</h3>
        <div className="tpl-grid">
          {TEMPLATES.map((t) => {
            const bg = t.background.type === 'solid' ? t.background.color : `linear-gradient(${t.background.angle}deg, ${t.background.from}, ${t.background.to})`;
            return (
              <button key={t.id} className={`tpl ${project.templateId === t.id ? 'on' : ''}`} onClick={() => setTemplate(t.id)}>
                <div className="sw" style={{ background: bg, color: t.titleColor, fontFamily: `"${t.titleFont}"` }}>{t.name}</div>
                <small>{t.description}</small>
              </button>
            );
          })}
        </div>
        <p className="hint">Cambiar la plantilla no modifica tus sueños ni el tamaño.</p>
      </div>
      <div className="section">
        <h3>Versiones de esta plantilla</h3>
        <p className="hint" style={{ marginTop: 0, marginBottom: 10 }}>El mismo mapa, listo en cada formato. Toca una versión para usarla; no necesitas rehacer nada.</p>
        <div className="versions">
          {VERSIONS.map((v) => {
            const cat = FORMAT_CATALOG.find((f) => f.id === v.id)!;
            const f = formatFromCatalog(cat);
            return (
              <button key={v.id} className={`version ${project.format.formatId === v.id ? 'on' : ''}`} onClick={() => setFormat(formatFromCatalog(cat, undefined, project.format))}>
                <BoardThumb format={f} templateId={project.templateId} content={project.content} assetMap={assetMap} maxW={84} maxH={120} />
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
