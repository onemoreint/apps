import { useState } from 'react';
import type { FormatCategory, PrintValidation } from '../core/types';
import type { ProjectApi } from '../store';
import { PRODUCTS, productToFormat, isPrintCategory, describeSize, FORMAT_CATALOG, formatFromCatalog } from '../core/formats';
import { AssistantBox, BleedPicker, CategoryChips, CustomSizeForm, DocResolution, FormatList, OrientationPicker, QualityPicker, SafePicker } from './FormatControls';
import { BoardThumb } from './board';
import { AlertsList } from './Inspector';
import { ExportPanel } from './ExportDialog';

const STEPS = ['Producto final', 'Tamaño', 'Orientación', 'Resolución', 'Sangrado', 'Márgenes', 'Exportación'];
const PRINT_PRODUCTS = PRODUCTS.filter((p) => ['poster-grande', 'cuadro', 'hoja-casa', 'pendon'].includes(p.id));

export function PrintWizard({ api, validation, onClose, onPreview }: { api: ProjectApi; validation: PrintValidation; onClose: () => void; onPreview: () => void }) {
  const { project, assetMap, actions } = api;
  const f = project.format;
  const [step, setStep] = useState(0);
  const [productId, setProductId] = useState<string | null>(null);
  const [cat, setCat] = useState<FormatCategory>(isPrintCategory(f.category) ? (f.formatId === 'custom' ? 'personalizado' : f.category) : 'poster');

  // El modo impresión siempre trabaja con un formato físico.
  const ensurePrint = () => {
    if (!isPrintCategory(f.category)) actions.setFormat(formatFromCatalog(FORMAT_CATALOG.find((x) => x.id === 'pos-50x70')!));
  };

  const content = [
    <div key="p">
      <p className="hint" style={{ marginTop: 0 }}>¿Qué vas a imprimir? Elegimos por ti tamaño, calidad y márgenes; luego puedes ajustar todo.</p>
      <div className="product-grid">
        {PRINT_PRODUCTS.map((p) => (
          <button key={p.id} className={`product ${productId === p.id ? 'on' : ''}`} onClick={() => { setProductId(p.id); const nf = productToFormat(p); actions.setFormat(nf); setCat(nf.category); }}>
            <span className="e">{p.emoji}</span>
            <b>{p.label}</b>
            <small>{p.description}</small>
          </button>
        ))}
      </div>
      <h4>O cuéntanos con tus palabras</h4>
      <AssistantBox onApply={(nf, p) => { setProductId(p.id); actions.setFormat(nf); setCat(nf.category); }} />
    </div>,
    <div key="s">
      <CategoryChips value={cat} onChange={setCat} />
      <div style={{ marginTop: 12 }}>
        {cat === 'digital' && <p className="hint">Para imprimir, elige un tamaño físico. Los formatos digitales están en el panel «Tamaño».</p>}
        {cat === 'personalizado' ? <CustomSizeForm key={f.widthMm + 'x' + f.heightMm} format={f} onChange={actions.setFormat} /> : cat !== 'digital' && <FormatList category={cat} format={f} onChange={actions.setFormat} />}
      </div>
    </div>,
    <div key="o">
      <OrientationPicker format={f} onChange={actions.setFormat} />
      <p className="hint">El diseño se reorganiza solo. Mira la vista previa a la derecha.</p>
    </div>,
    <div key="r">
      <QualityPicker format={f} onChange={actions.setFormat} />
      <DocResolution format={f} />
    </div>,
    <div key="b"><BleedPicker format={f} onChange={actions.setFormat} /></div>,
    <div key="m"><SafePicker format={f} onChange={actions.setFormat} /></div>,
    <div key="e"><ExportPanel api={api} validation={validation} /></div>,
  ];

  const go = (i: number) => { ensurePrint(); setStep(Math.max(0, Math.min(STEPS.length - 1, i))); };

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide" role="dialog" aria-modal="true" aria-labelledby="wiz-title">
        <div className="modal-head">
          <h2 id="wiz-title">🖨️ Preparar para impresión</h2>
          <button className="btn sm" onClick={onPreview}>👁️ Vista previa</button>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="modal-body">
          <div className="stepper">
            {STEPS.map((s, i) => (
              <button key={s} className={`step ${i === step ? 'on' : ''} ${i < step ? 'done' : ''}`} onClick={() => go(i)}>
                <span>Paso {i + 1}</span><b>{s}</b>
              </button>
            ))}
          </div>
          {step === 6 ? content[6] : (
            <div className="wizard-layout">
              <div>{content[step]}</div>
              <div>
                <div className="mini-preview">
                  {isPrintCategory(f.category)
                    ? <BoardThumb format={f} templateId={project.templateId} content={project.content} assetMap={assetMap} maxW={260} maxH={300} guides />
                    : <p className="hint">Elige un producto para ver la vista previa.</p>}
                </div>
                <p className="hint" style={{ textAlign: 'center' }}>{describeSize(f)}</p>
                <AlertsList validation={validation} />
              </div>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" disabled={step === 0} onClick={() => go(step - 1)}>← Atrás</button>
          {step < STEPS.length - 1 && <button className="btn primary" onClick={() => go(step + 1)}>Siguiente →</button>}
          {step === STEPS.length - 1 && <button className="btn" onClick={onClose}>Cerrar</button>}
        </div>
      </div>
    </div>
  );
}
