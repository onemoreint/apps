import { useEffect, useMemo, useRef, useState } from 'react';
import { useProject } from './store';
import { getTemplate } from './core/templates';
import { validateBoard } from './core/validation';
import { describeSize, isPrintCategory, reorient } from './core/formats';
import type { Orientation } from './core/types';
import { BoardPreview } from './components/BoardPreview';
import { DreamsPanel } from './components/DreamsPanel';
import { DesignPanel } from './components/DesignPanel';
import { SizePanel } from './components/SizePanel';
import { Inspector } from './components/Inspector';
import { ImagePicker } from './components/ImagePicker';
import { ExportDialog } from './components/ExportDialog';
import { PrintPreview } from './components/PrintPreview';
import { PrintWizard } from './components/PrintWizard';

type LeftTab = 'suenos' | 'diseno' | 'tamano';

export default function App() {
  const api = useProject();
  const { project, assetMap, actions } = api;
  const [tab, setTab] = useState<LeftTab>('suenos');
  const [selected, setSelected] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [modal, setModal] = useState<'export' | 'preview' | 'wizard' | null>(null);
  const [previewOver, setPreviewOver] = useState(false);
  const [toast, setToast] = useState('');

  const template = getTemplate(project.templateId);
  const validation = useMemo(() => validateBoard(project.format, template, project.content, assetMap), [project.format, template, project.content, assetMap]);
  const print = isPrintCategory(project.format.category);

  // Aviso al cambiar de formato: el diseño se recompone, no se pierde.
  const prevSize = useRef(describeSize(project.format));
  useEffect(() => {
    const now = describeSize(project.format);
    if (now !== prevSize.current) {
      prevSize.current = now;
      setToast(`✓ Diseño reorganizado para ${now}`);
      const t = setTimeout(() => setToast(''), 2600);
      return () => clearTimeout(t);
    }
  }, [project.format]);

  const reorganize = () => {
    actions.updateContent((c) => ({ ...c, dreams: c.dreams.map((d) => ({ ...d, focusX: 0.5, focusY: 0.5 })) }));
    setToast(`✓ Reorganizado para ${describeSize(project.format)}: distribución y encuadres ajustados`);
    setTimeout(() => setToast(''), 2600);
  };

  const orient = (o: Orientation) => actions.setFormat(reorient(project.format, o));
  const openPicker = (id: string) => { setSelected(id); setPickerFor(id); };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden>✦</span>
          <span>DREAMMAP AI<small>Mapa de sueños para pantalla e impresión</small></span>
        </div>
        <div className="project-name">
          <input aria-label="Nombre del proyecto" value={project.content.projectName} onChange={(e) => actions.updateContent((c) => ({ ...c, projectName: e.target.value }))} />
        </div>
        <div className="top-actions">
          <button className="btn" onClick={() => setModal('wizard')}>🖨️ <span className="label-long">Preparar para impresión</span></button>
          <button className="btn primary" onClick={() => setModal('export')}>⬇️ Exportar</button>
        </div>
      </header>

      <main className="workspace">
        <aside className="panel" aria-label="Contenido, diseño y tamaño">
          <div className="tabs" role="tablist">
            {([['suenos', '✨ Sueños'], ['diseno', '🎨 Diseño'], ['tamano', '📐 Tamaño']] as [LeftTab, string][]).map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
          {tab === 'suenos' && <DreamsPanel api={api} selectedId={selected} onSelect={setSelected} onOpenPicker={openPicker} />}
          {tab === 'diseno' && <DesignPanel project={project} assetMap={assetMap} setTemplate={actions.setTemplate} setFormat={actions.setFormat} />}
          {tab === 'tamano' && <SizePanel format={project.format} onChange={actions.setFormat} />}
        </aside>

        <section className="stage" aria-label="Lienzo">
          <div className="stage-toolbar">
            <span className="format-pill">{project.format.label} · {describeSize(project.format)}</span>
            <div className="seg" aria-label="Orientación">
              {(['vertical', 'horizontal', 'cuadrado'] as Orientation[]).map((o) => (
                <button key={o} className={project.format.orientation === o ? 'on' : ''} onClick={() => orient(o)} title={o}>
                  {o === 'vertical' ? '▯' : o === 'horizontal' ? '▭' : '□'}
                </button>
              ))}
            </div>
            {print && (
              <label className="check"><input type="checkbox" checked={project.format.showGuides} onChange={(e) => actions.setFormat({ ...project.format, showGuides: e.target.checked })} /> Guías</label>
            )}
            <span className="spacer" />
            <button className="btn sm" onClick={reorganize}>🔄 Reorganizar para este formato</button>
            <button className="btn sm" onClick={() => setPreviewOver(true)}>👁️ Vista previa</button>
          </div>
          <BoardPreview project={project} assetMap={assetMap} selectedId={selected} onSelect={setSelected} onOpenPicker={openPicker} />
          {print && project.format.showGuides && (
            <div className="legend">
              {project.format.bleedMm > 0 && <span><i style={{ borderColor: '#ef4444' }} />Corte (lo rojo exterior es sangrado)</span>}
              <span><i style={{ borderColor: '#06b6d4' }} />Zona segura</span>
            </div>
          )}
          {toast && (
            <div role="status" style={{ position: 'absolute', left: '50%', bottom: 24, transform: 'translateX(-50%)', background: 'var(--panel)', border: '1px solid var(--line)', padding: '10px 16px', borderRadius: 999, boxShadow: 'var(--shadow)', fontWeight: 600, maxWidth: '90%', textAlign: 'center' }}>
              {toast}
            </div>
          )}
        </section>

        <aside className="panel right" aria-label="Revisión e imagen">
          <Inspector api={api} selectedId={selected} validation={validation} onSelect={setSelected} onOpenPicker={openPicker} />
        </aside>
      </main>

      {pickerFor && <ImagePicker api={api} dreamId={pickerFor} onClose={() => setPickerFor(null)} />}
      {modal === 'export' && <ExportDialog api={api} validation={validation} onClose={() => setModal(null)} onPreview={() => setPreviewOver(true)} />}
      {modal === 'wizard' && <PrintWizard api={api} validation={validation} onClose={() => setModal(null)} onPreview={() => setPreviewOver(true)} />}
      {previewOver && <PrintPreview api={api} onClose={() => setPreviewOver(false)} />}
    </div>
  );
}
