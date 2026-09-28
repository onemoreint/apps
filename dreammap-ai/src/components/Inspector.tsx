import type { PrintValidation } from '../core/types';
import type { ProjectApi } from '../store';
import { isPrintCategory } from '../core/formats';
import { SOURCE_LABELS } from '../providers/assets';
import { candidateQuality, ImageSpecs, QualityBadge } from './quality';

const ICON = { ok: '🟢', info: 'ℹ️', warning: '⚠️', error: '⛔' } as const;

export function AlertsList({ validation, onPick }: { validation: PrintValidation; onPick?: (dreamId: string) => void }) {
  return (
    <div>
      {validation.alerts.map((a) => (
        <div key={a.id} className={`alert ${a.severity} ${a.dreamId && onPick ? 'clickable' : ''}`}
          onClick={() => a.dreamId && onPick?.(a.dreamId)} role={a.dreamId && onPick ? 'button' : undefined}>
          <span className="ic">{ICON[a.severity]}</span>
          <span>{a.message}</span>
        </div>
      ))}
    </div>
  );
}

export function LicenseTag({ commercial }: { commercial: boolean | 'unknown' }) {
  if (commercial === true) return <span className="tag ok">Uso comercial permitido</span>;
  if (commercial === false) return <span className="tag no">No comercial</span>;
  return <span className="tag maybe">Licencia por confirmar</span>;
}

export function Inspector({ api, selectedId, validation, onSelect, onOpenPicker }: {
  api: ProjectApi; selectedId: string | null; validation: PrintValidation; onSelect: (id: string) => void; onOpenPicker: (id: string) => void;
}) {
  const { project, assetMap, actions } = api;
  const dream = project.content.dreams.find((d) => d.id === selectedId);
  const asset = dream?.imageId ? assetMap.get(dream.imageId) : undefined;
  const print = isPrintCategory(project.format.category);
  const q = dream && asset ? candidateQuality(project, dream.id, asset) : null;

  return (
    <>
      <div className="section">
        <h3>{print ? '🖨️ Revisión de impresión' : '📱 Revisión'}</h3>
        <AlertsList validation={validation} onPick={onSelect} />
      </div>
      <div className="section">
        <h3>Imagen seleccionada</h3>
        {!dream && <p className="hint">Toca un sueño en el mapa para ver su imagen, calidad y encuadre.</p>}
        {dream && !asset && (
          <>
            <p className="hint">«{dream.title}» aún no tiene imagen.</p>
            <button className="btn primary block" onClick={() => onOpenPicker(dream.id)}>🖼️ Elegir imagen</button>
          </>
        )}
        {dream && asset && (
          <>
            <div className="big-thumb" style={{ backgroundImage: `url("${asset.src}")`, backgroundPosition: `${dream.focusX * 100}% ${dream.focusY * 100}%` }} />
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="label">CALIDAD {print ? 'DE IMPRESIÓN' : 'EN PANTALLA'}</span>
              <QualityBadge q={q} />
            </div>
            <ImageSpecs asset={asset} q={q} print={print} />
            <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
              <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                <span className="tag">Imagen incorporada al mapa</span>
                <span className="tag">{SOURCE_LABELS[asset.source]}</span>
                {asset.license && asset.source !== 'library' && <LicenseTag commercial={asset.license.commercialUse} />}
              </div>
              {asset.license && <span className="hint" style={{ margin: 0 }}>Licencia: {asset.license.name}{asset.license.attribution ? ` · Autor: ${asset.license.attribution}` : ''}</span>}
              {asset.origin?.pageUrl && <a href={asset.origin.pageUrl} target="_blank" rel="noreferrer noopener" className="hint">Ver fuente original ↗</a>}
            </div>
            <h4>Encuadre</h4>
            <div className="field">
              <label htmlFor="fx">Horizontal</label>
              <input id="fx" type="range" min={0} max={1} step={0.01} value={dream.focusX} onChange={(e) => actions.updateDream(dream.id, { focusX: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label htmlFor="fy">Vertical</label>
              <input id="fy" type="range" min={0} max={1} step={0.01} value={dream.focusY} onChange={(e) => actions.updateDream(dream.id, { focusY: Number(e.target.value) })} />
            </div>
            <div className="row">
              <button className="btn sm grow" onClick={() => onOpenPicker(dream.id)}>Cambiar imagen</button>
              <button className="btn sm ghost danger" onClick={() => actions.updateDream(dream.id, { imageId: undefined })}>Quitar</button>
            </div>
          </>
        )}
        {dream && dream.references.length > 0 && (
          <>
            <h4>Referencias de inspiración</h4>
            <p className="hint" style={{ marginTop: 0 }}>No se imprimen: solo te ayudan a elegir o generar la imagen.</p>
            {dream.references.map((r) => (
              <div key={r.id} className="ref-item">
                <span>📌</span>
                <a href={r.url} target="_blank" rel="noreferrer noopener">{r.note || r.url}</a>
                <button className="icon-btn" aria-label="Eliminar referencia" onClick={() => actions.removeReference(dream.id, r.id)}>✕</button>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
