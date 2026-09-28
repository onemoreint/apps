import { useState } from 'react';
import type { DocumentFormat, FormatCategory, Orientation, PrintQuality, Unit } from '../core/types';
import {
  CATEGORY_LABELS, FORMAT_CATALOG, QUALITY_DPI, QUALITY_LABELS, UNIT_LABELS, customFormat, describeSize, documentResolution,
  exportableDpi, formatFromCatalog, formatNumber, fromMm, isPrintCategory, productToFormat, recommendProduct, reorient, toMm, type Product,
} from '../core/formats';

type Props = { format: DocumentFormat; onChange: (f: DocumentFormat) => void };

export const CATEGORIES: FormatCategory[] = ['digital', 'impresion', 'poster', 'pendon', 'personalizado'];

export function CategoryChips({ value, onChange }: { value: FormatCategory; onChange: (c: FormatCategory) => void }) {
  return (
    <div className="chips" role="tablist">
      {CATEGORIES.map((c) => (
        <button key={c} className={`chip ${value === c ? 'on' : ''}`} onClick={() => onChange(c)}>{CATEGORY_LABELS[c]}</button>
      ))}
    </div>
  );
}

function Shape({ w, h }: { w: number; h: number }) {
  const s = 26 / Math.max(w, h);
  return <span className="shape"><span style={{ width: Math.max(6, w * s), height: Math.max(6, h * s) }} /></span>;
}

export function FormatList({ category, format, onChange }: Props & { category: FormatCategory }) {
  const items = FORMAT_CATALOG.filter((f) => f.category === category);
  return (
    <div className="format-list">
      {items.map((f) => {
        const on = format.formatId === f.id;
        return (
          <button key={f.id} className={`format-item ${on ? 'on' : ''}`} onClick={() => onChange(formatFromCatalog(f, undefined, format))}>
            <Shape w={f.width} h={f.height} />
            <span className="grow">
              <b>{f.label}</b>
              <small>{f.unit === 'px' ? `${f.width} × ${f.height} px` : `${formatNumber(f.width, 2)} × ${formatNumber(f.height, 2)} cm`}{f.hint ? ` · ${f.hint}` : ''}</small>
            </span>
            {on && <span aria-hidden>✓</span>}
          </button>
        );
      })}
    </div>
  );
}

export function OrientationPicker({ format, onChange }: Props) {
  const opts: { id: Orientation; label: string }[] = [
    { id: 'vertical', label: '▯ Vertical' },
    { id: 'horizontal', label: '▭ Horizontal' },
    { id: 'cuadrado', label: '□ Cuadrado' },
  ];
  return (
    <div className="seg full">
      {opts.map((o) => (
        <button key={o.id} className={format.orientation === o.id ? 'on' : ''} onClick={() => onChange(reorient(format, o.id))}>{o.label}</button>
      ))}
    </div>
  );
}

export function DocResolution({ format }: { format: DocumentFormat }) {
  const r = documentResolution(format);
  const exp = exportableDpi(format);
  if (!isPrintCategory(format.category)) {
    return (
      <div className="doc-res">
        <span className="label">RESOLUCIÓN DEL DOCUMENTO</span>
        <strong>{r.trimPxW} × {r.trimPxH} px</strong>
        <span className="hint">Formato digital: se exporta exactamente a este tamaño.</span>
      </div>
    );
  }
  return (
    <div className="doc-res">
      <span className="label">RESOLUCIÓN DEL DOCUMENTO</span>
      <strong>{describeSize(format)} · {r.dpi} DPI</strong>
      → {r.trimPxW.toLocaleString('es-CO')} × {r.trimPxH.toLocaleString('es-CO')} px ({formatNumber(r.megapixels, 1)} MP{format.bleedMm ? ' con sangrado' : ''})
      {exp.capped && <div className="hint">En este navegador se exportará a {exp.dpi} DPI por límite de memoria.</div>}
      <div className="hint">DPI es la densidad real de píxeles impresos, no una ampliación artificial.</div>
    </div>
  );
}

export function QualityPicker({ format, onChange }: Props) {
  if (!isPrintCategory(format.category)) return null;
  const qs: PrintQuality[] = ['estandar', 'alta', 'profesional'];
  return (
    <>
      <div className="seg full">
        {qs.map((q) => (
          <button key={q} className={format.quality === q ? 'on' : ''} onClick={() => onChange({ ...format, quality: q })}>
            {QUALITY_LABELS[q]} · {QUALITY_DPI[q]}
          </button>
        ))}
      </div>
      <p className="hint">Estándar: se mira de lejos (pendones). Alta: buena para casa. Profesional: imprenta, se mira de cerca.</p>
    </>
  );
}

function MmOptions({ value, options, onChange, noneLabel }: { value: number; options: number[]; onChange: (v: number) => void; noneLabel?: string }) {
  const isCustom = !options.includes(value) && !(noneLabel && value === 0);
  const [custom, setCustom] = useState(isCustom);
  return (
    <div className="row" style={{ flexWrap: 'wrap' }}>
      <div className="seg">
        {noneLabel && <button className={value === 0 && !custom ? 'on' : ''} onClick={() => { setCustom(false); onChange(0); }}>{noneLabel}</button>}
        {options.map((o) => (
          <button key={o} className={value === o && !custom ? 'on' : ''} onClick={() => { setCustom(false); onChange(o); }}>{o} mm</button>
        ))}
        <button className={custom || isCustom ? 'on' : ''} onClick={() => setCustom(true)}>Personalizado</button>
      </div>
      {(custom || isCustom) && (
        <input className="input" style={{ width: 90 }} type="number" min={0} max={100} step={0.5} value={value} aria-label="Milímetros"
          onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
      )}
    </div>
  );
}

export function BleedPicker({ format, onChange }: Props) {
  if (!isPrintCategory(format.category)) return null;
  return (
    <>
      <MmOptions value={format.bleedMm} options={[3, 5]} noneLabel="Sin sangrado" onChange={(v) => onChange({ ...format, bleedMm: v })} />
      <p className="hint"><b>Sangrado:</b> área adicional que se imprime fuera del tamaño final para evitar bordes blancos después del corte. En la vista previa se ve en rojo.</p>
    </>
  );
}

export function SafePicker({ format, onChange }: Props) {
  if (!isPrintCategory(format.category)) return null;
  return (
    <>
      <MmOptions value={format.safeMm} options={[5, 10, 15, 20]} onChange={(v) => onChange({ ...format, safeMm: v })} />
      <p className="hint">Los textos e imágenes importantes se mantienen dentro de la línea azul para que no se corten.</p>
      <label className="check" style={{ marginTop: 8 }}>
        <input type="checkbox" checked={format.showGuides} onChange={(e) => onChange({ ...format, showGuides: e.target.checked })} /> Mostrar guías
      </label>
    </>
  );
}

const UNITS: Unit[] = ['mm', 'cm', 'in', 'px'];

export function CustomSizeForm({ format, onChange }: Props) {
  const initUnit: Unit = format.pixelWidth ? 'px' : 'cm';
  const [wUnit, setWUnit] = useState<Unit>(initUnit);
  const [hUnit, setHUnit] = useState<Unit>(initUnit);
  const [w, setW] = useState<string>(() => String(format.pixelWidth ?? Math.round(fromMm(format.widthMm, 'cm') * 100) / 100));
  const [h, setH] = useState<string>(() => String(format.pixelHeight ?? Math.round(fromMm(format.heightMm, 'cm') * 100) / 100));
  const [keep, setKeep] = useState(false);
  const [error, setError] = useState('');

  const num = (v: unknown) => Number(String(v).replace(',', '.'));
  const ratio = () => toMm(num(w), wUnit) / toMm(num(h), hUnit);

  const apply = (W = num(w), H = num(h), wu = wUnit, hu = hUnit) => {
    if (!(W > 0 && H > 0)) { setError('Escribe un ancho y un alto mayores que cero.'); return; }
    if ((wu === 'px') !== (hu === 'px')) { setError('Usa píxeles en ambas medidas, o medidas físicas (mm, cm, pulgadas) en ambas.'); return; }
    const wMm = toMm(W, wu), hMm = toMm(H, hu);
    if (wu !== 'px' && (wMm > 5000 || hMm > 5000)) { setError('El tamaño máximo es 5 metros por lado.'); return; }
    if (wu === 'px' && (W > 20000 || H > 20000)) { setError('El máximo es 20.000 px por lado.'); return; }
    setError('');
    if (wu === 'px') onChange(customFormat(W, H, 'px', format));
    else {
      const f = customFormat(wMm / 10, hMm / 10, 'cm', format);
      onChange(f);
    }
  };

  const setOrientation = (o: 'vertical' | 'horizontal') => {
    const W = num(w), H = num(h);
    const isV = toMm(W, wUnit) <= toMm(H, hUnit);
    if ((o === 'vertical') === isV) return;
    setW(String(H)); setH(String(W)); setWUnit(hUnit); setHUnit(wUnit);
    apply(H, W, hUnit, wUnit);
  };

  const unitSel = (v: Unit, set: (u: Unit) => void, label: string) => (
    <select className="input" style={{ width: 110 }} aria-label={label} value={v} onChange={(e) => set(e.target.value as Unit)}>
      {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
    </select>
  );
  const isV = toMm(num(w), wUnit) <= toMm(num(h), hUnit);

  return (
    <div>
      <div className="field">
        <label htmlFor="cw">Ancho</label>
        <div className="row">
          <input id="cw" className="input grow" inputMode="decimal" value={w} onChange={(e) => {
            const nw = e.target.value;
            if (keep && num(nw) > 0) {
              const r = ratio();
              const nh = fromMm(toMm(num(nw), wUnit) / r, hUnit);
              setH(String(Math.round(nh * 100) / 100));
            }
            setW(nw);
          }} />
          {unitSel(wUnit, (u) => { setWUnit(u); if (u === 'px' || hUnit === 'px') setHUnit(u); }, 'Unidad del ancho')}
        </div>
      </div>
      <div className="field">
        <label htmlFor="ch">Alto</label>
        <div className="row">
          <input id="ch" className="input grow" inputMode="decimal" value={h} onChange={(e) => {
            const nh = e.target.value;
            if (keep && num(nh) > 0) {
              const r = ratio();
              const nw = fromMm(toMm(num(nh), hUnit) * r, wUnit);
              setW(String(Math.round(nw * 100) / 100));
            }
            setH(nh);
          }} />
          {unitSel(hUnit, (u) => { setHUnit(u); if (u === 'px' || wUnit === 'px') setWUnit(u); }, 'Unidad del alto')}
        </div>
      </div>
      <div className="row" style={{ gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
        <label className="check"><input type="radio" name="corient" checked={isV} onChange={() => setOrientation('vertical')} /> Vertical</label>
        <label className="check"><input type="radio" name="corient" checked={!isV} onChange={() => setOrientation('horizontal')} /> Horizontal</label>
        <label className="check"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /> Mantener proporción</label>
      </div>
      {error && <p className="error-text">{error}</p>}
      <button className="btn primary block" onClick={() => apply()}>Aplicar tamaño personalizado</button>
    </div>
  );
}

export function AssistantBox({ onApply }: { onApply: (f: DocumentFormat, p: Product) => void }) {
  const [text, setText] = useState('');
  const [reco, setReco] = useState<Product | null>(null);
  const [tried, setTried] = useState(false);
  const run = () => { setTried(true); setReco(recommendProduct(text)); };
  const f = reco ? productToFormat(reco) : null;
  return (
    <div>
      <div className="row">
        <input className="input grow" placeholder="Ej.: quiero imprimirlo grande para mi habitación" value={text}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} aria-label="¿Para qué quieres tu mapa?" />
        <button className="btn" onClick={run}>Sugerir</button>
      </div>
      {tried && !reco && <p className="hint">Cuéntame dónde lo usarás: pared, celular, evento, Instagram, pantalla…</p>}
      {reco && f && (
        <div className="reco">
          <div className="title">{reco.emoji} {reco.label.toUpperCase()}</div>
          <div>{describeSize(f)}{isPrintCategory(f.category) ? ` · ${QUALITY_LABELS[f.quality]} · ${QUALITY_DPI[f.quality]} DPI · ${f.bleedMm ? `Sangrado ${f.bleedMm} mm` : 'Sin sangrado'}` : ''}</div>
          <div className="ok">✓ Recomendado para este uso</div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn primary sm" onClick={() => onApply(f, reco)}>Aceptar</button>
            <button className="btn ghost sm" onClick={() => setReco(null)}>Cambiar manualmente</button>
          </div>
        </div>
      )}
    </div>
  );
}
