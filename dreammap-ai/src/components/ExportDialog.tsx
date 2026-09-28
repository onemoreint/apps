import { useEffect, useMemo, useState } from 'react';
import type { ExportFileType, PrintValidation } from '../core/types';
import type { ProjectApi } from '../store';
import { getTemplate } from '../core/templates';
import { describeSize, estimateFileBytes, formatNumber, humanBytes, isPrintCategory } from '../core/formats';
import { buildExportSettings, downloadBlob, exportBoard } from '../core/export';
import { AlertsList } from './Inspector';

const ORIENT: Record<string, string> = { vertical: 'Vertical', horizontal: 'Horizontal', cuadrado: 'Cuadrado' };

export function TechnicalInfo({ api, fileType }: { api: ProjectApi; fileType: ExportFileType }) {
  const { project } = api;
  const f = project.format;
  const print = isPrintCategory(f.category);
  const s = buildExportSettings(f, fileType);
  const bytes = estimateFileBytes(s.pixelWidth * s.pixelHeight, fileType);
  return (
    <dl className="spec">
      <dt>Nombre del proyecto</dt><dd>{project.content.projectName}</dd>
      <dt>Formato</dt><dd>{f.label}</dd>
      <dt>Ancho</dt><dd>{print ? `${formatNumber(f.widthMm / 10, 2)} cm` : `${f.pixelWidth} px`}</dd>
      <dt>Alto</dt><dd>{print ? `${formatNumber(f.heightMm / 10, 2)} cm` : `${f.pixelHeight} px`}</dd>
      <dt>Unidad</dt><dd>{print ? 'Centímetros' : 'Píxeles'}</dd>
      <dt>Orientación</dt><dd>{ORIENT[f.orientation]}</dd>
      <dt>Resolución</dt><dd>{s.pixelWidth.toLocaleString('es-CO')} × {s.pixelHeight.toLocaleString('es-CO')} px</dd>
      <dt>DPI</dt><dd>{print ? `${s.dpi}${s.capped ? ` (pedido ${s.requestedDpi})` : ''}` : 'Pantalla'}</dd>
      <dt>Sangrado</dt><dd>{print ? (f.bleedMm ? `${formatNumber(f.bleedMm)} mm` : 'Sin sangrado') : '—'}</dd>
      <dt>Zona segura</dt><dd>{print ? `${formatNumber(f.safeMm)} mm` : 'Automática'}</dd>
      <dt>Peso estimado</dt><dd>≈ {humanBytes(bytes)}</dd>
      <dt>Formato de archivo</dt><dd>{fileType === 'pdf' ? 'PDF' : fileType === 'jpg' ? 'JPG' : print ? 'PNG alta resolución' : 'PNG'}</dd>
    </dl>
  );
}

export function ExportPanel({ api, validation, onDone }: { api: ProjectApi; validation: PrintValidation; onDone?: () => void }) {
  const { project, assets } = api;
  const print = isPrintCategory(project.format.category);
  const [type, setType] = useState<ExportFileType>(print ? 'pdf' : 'png');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');
  useEffect(() => { setType(print ? 'pdf' : 'png'); }, [print]);

  const used = useMemo(() => {
    const ids = new Set(project.content.dreams.map((d) => d.imageId).filter(Boolean));
    return assets.filter((a) => ids.has(a.id));
  }, [assets, project.content.dreams]);

  const run = async () => {
    setBusy(true); setErr(''); setDone('');
    try {
      await new Promise((r) => setTimeout(r, 30));
      const settings = buildExportSettings(project.format, type);
      const { blob, filename } = await exportBoard(project.format, getTemplate(project.templateId), project.content, used, settings);
      const status = await downloadBlob(blob, filename);
      if (status === 'declined') { setDone(''); return; }
      setDone(`Listo: ${filename} (${humanBytes(blob.size)})`);
      onDone?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const opt = (t: ExportFileType, label: string, desc: string) => (
    <button className={`format-item ${type === t ? 'on' : ''}`} onClick={() => setType(t)}>
      <span className="grow"><b>{label}</b><small>{desc}</small></span>{type === t && '✓'}
    </button>
  );

  return (
    <div className="wizard-layout">
      <div>
        <h4 style={{ marginTop: 0 }}>📱 Digital</h4>
        <div className="format-list">
          {!print && opt('png', 'PNG', 'Máxima calidad para pantalla.')}
          {opt('jpg', 'JPG', 'Archivo más liviano para compartir por WhatsApp o redes.')}
        </div>
        <h4>🖨️ Impresión</h4>
        <div className="format-list">
          {opt('pdf', 'PDF para imprenta', print ? `Con medidas físicas reales (${describeSize(project.format)}${project.format.bleedMm ? ` + ${project.format.bleedMm} mm de sangrado` : ''}).` : 'Documento con las proporciones del diseño.')}
          {print && opt('png', 'PNG de alta resolución', 'Sin compresión, con el DPI guardado en el archivo.')}
        </div>
        <h4>Revisión</h4>
        <AlertsList validation={validation} />
      </div>
      <div>
        <div className="preview-pane" style={{ position: 'static' }}>
          <h4 style={{ marginTop: 0 }}>Información técnica del archivo</h4>
          <TechnicalInfo api={api} fileType={type} />
          {!validation.ready && <p className="error-text" style={{ marginTop: 10 }}>Hay puntos por corregir. Puedes exportar igual, pero el resultado impreso podría no verse bien.</p>}
          {err && <p className="error-text">{err}</p>}
          {done && <p style={{ color: 'var(--ok)', fontWeight: 600 }}>✓ {done}</p>}
          <button className="btn primary block" style={{ marginTop: 12 }} disabled={busy} onClick={run}>
            {busy ? <><span className="spinner" /> Generando…</> : '⬇️ Exportar'}
          </button>
          <p className="hint">Se genera en tu dispositivo; tus imágenes no se suben a ningún servidor.</p>
        </div>
      </div>
    </div>
  );
}

export function ExportDialog({ api, validation, onClose, onPreview }: { api: ProjectApi; validation: PrintValidation; onClose: () => void; onPreview: () => void }) {
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="exp-title">
        <div className="modal-head">
          <h2 id="exp-title">Exportar mapa</h2>
          <button className="btn sm" onClick={onPreview}>👁️ Vista previa de impresión</button>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="modal-body"><ExportPanel api={api} validation={validation} /></div>
      </div>
    </div>
  );
}
