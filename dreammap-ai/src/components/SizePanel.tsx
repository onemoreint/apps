import { useState } from 'react';
import type { DocumentFormat, FormatCategory } from '../core/types';
import { isPrintCategory } from '../core/formats';
import { AssistantBox, BleedPicker, CategoryChips, CustomSizeForm, DocResolution, FormatList, OrientationPicker, QualityPicker, SafePicker } from './FormatControls';

export function SizePanel({ format, onChange }: { format: DocumentFormat; onChange: (f: DocumentFormat) => void }) {
  const [cat, setCat] = useState<FormatCategory>(format.formatId === 'custom' ? 'personalizado' : format.category);
  const print = isPrintCategory(format.category);
  return (
    <>
      <div className="section">
        <h3>✨ ¿Para qué lo quieres?</h3>
        <AssistantBox onApply={(f) => { onChange(f); setCat(f.category); }} />
      </div>
      <div className="section">
        <h3>📐 Tamaño del mapa</h3>
        <CategoryChips value={cat} onChange={setCat} />
        <div style={{ marginTop: 12 }}>
          {cat === 'personalizado' ? (
            <CustomSizeForm key={format.formatId + format.widthMm + format.heightMm} format={format} onChange={onChange} />
          ) : (
            <FormatList category={cat} format={format} onChange={onChange} />
          )}
          {cat === 'pendon' && <p className="hint">¿Necesitas otra medida? Usa «Personalizado».</p>}
        </div>
      </div>
      <div className="section">
        <h3>Orientación</h3>
        <OrientationPicker format={format} onChange={onChange} />
        <p className="hint">El diseño se reorganiza automáticamente al cambiar.</p>
      </div>
      {print && (
        <>
          <div className="section">
            <h3>Calidad de impresión</h3>
            <QualityPicker format={format} onChange={onChange} />
            <DocResolution format={format} />
          </div>
          <div className="section">
            <h3>Sangrado</h3>
            <BleedPicker format={format} onChange={onChange} />
          </div>
          <div className="section">
            <h3>Margen seguro</h3>
            <SafePicker format={format} onChange={onChange} />
          </div>
        </>
      )}
      {!print && (
        <div className="section">
          <DocResolution format={format} />
        </div>
      )}
    </>
  );
}
