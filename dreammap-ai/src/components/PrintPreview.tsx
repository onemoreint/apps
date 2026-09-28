import { useState } from 'react';
import type { ProjectApi } from '../store';
import { describeSize, isPrintCategory } from '../core/formats';
import { BoardThumb, useSize } from './board';

type Scene = 'exacto' | 'marco' | 'pared' | 'poster' | 'pendon' | 'celular' | 'pantalla';

const SCENES: { id: Scene; label: string; print: boolean; digital: boolean }[] = [
  { id: 'exacto', label: 'Exacto (con cortes)', print: true, digital: true },
  { id: 'pared', label: 'En la pared', print: true, digital: false },
  { id: 'marco', label: 'Con marco', print: true, digital: false },
  { id: 'poster', label: 'Póster', print: true, digital: false },
  { id: 'pendon', label: 'Pendón', print: true, digital: false },
  { id: 'celular', label: 'Celular', print: false, digital: true },
  { id: 'pantalla', label: 'Pantalla', print: false, digital: true },
];

function Sofa({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <svg style={{ position: 'absolute', left: x, top: y }} width={w} height={h} viewBox="0 0 210 85" preserveAspectRatio="none" aria-hidden>
      <rect x="8" y="10" width="194" height="42" rx="10" fill="#6b7a8f" />
      <rect x="0" y="38" width="210" height="34" rx="10" fill="#5a6879" />
      <rect x="0" y="30" width="22" height="42" rx="8" fill="#4f5c6c" /><rect x="188" y="30" width="22" height="42" rx="8" fill="#4f5c6c" />
      <rect x="18" y="72" width="8" height="13" fill="#3a3025" /><rect x="184" y="72" width="8" height="13" fill="#3a3025" />
    </svg>
  );
}

function Person({ x, y, h }: { x: number; y: number; h: number }) {
  return (
    <svg style={{ position: 'absolute', left: x, top: y }} width={h * 0.24} height={h} viewBox="0 0 30 100" preserveAspectRatio="none" aria-hidden>
      <circle cx="15" cy="8" r="7" fill="#4b5563" />
      <path d="M6 18 H24 L27 55 H22 L21 100 H16 L15 60 L14 100 H9 L8 55 H3Z" fill="#4b5563" />
    </svg>
  );
}

export function PrintPreview({ api, onClose }: { api: ProjectApi; onClose: () => void }) {
  const { project, assetMap } = api;
  const f = project.format;
  const print = isPrintCategory(f.category);
  const available = SCENES.filter((s) => (print ? s.print : s.digital));
  const [scene, setScene] = useState<Scene>(print ? (f.category === 'pendon' ? 'pendon' : 'pared') : 'celular');
  const [ref, size] = useSize<HTMLDivElement>();
  const W = size.w, H = size.w * 0.625;

  const wCm = f.widthMm / 10, hCm = f.heightMm / 10;
  const thumb = (maxW: number, maxH: number, guides = false) => (
    <BoardThumb format={f} templateId={project.templateId} content={project.content} assetMap={assetMap} maxW={maxW} maxH={maxH} guides={guides} />
  );

  let body: React.ReactNode = null;
  if (scene === 'exacto') {
    body = <div className="scene flat">{thumb(W * 0.9, H * 0.9, print)}<span className="size-note">{describeSize(f)}{print && f.bleedMm ? ` · rojo: sangrado que se corta · azul: zona segura` : ''}</span></div>;
  } else if (scene === 'pared' || scene === 'marco' || scene === 'poster') {
    // Pared de referencia: ancho mínimo 320 cm, altura hasta el piso 78%.
    const frameCm = scene === 'marco' ? Math.max(3, Math.min(wCm, hCm) * 0.08) : 0;
    const matCm = scene === 'marco' ? Math.max(4, Math.min(wCm, hCm) * 0.1) : 0;
    const outerW = wCm + (frameCm + matCm) * 2, outerH = hCm + (frameCm + matCm) * 2;
    const floorFrac = 0.78;
    const sofaH = 85, gapAbove = 25;
    const wallCm = Math.max(320, outerW * 1.5, ((outerH + sofaH + gapAbove + 20) / floorFrac) * 1.6);
    const ppc = W / wallCm;
    const floorY = H * floorFrac;
    const sofaW = 210 * ppc;
    const bw = outerW * ppc, bh = outerH * ppc;
    const top = Math.max(8, floorY - (sofaH + gapAbove) * ppc - bh);
    body = (
      <div className="scene wall" style={{ display: 'block' }}>
        <Sofa x={(W - sofaW) / 2} y={floorY - sofaH * ppc} w={sofaW} h={sofaH * ppc} />
        <div style={{
          position: 'absolute', left: (W - bw) / 2, top, width: bw, height: bh, display: 'grid', placeItems: 'center',
          background: scene === 'marco' ? '#fbfaf7' : 'transparent',
          border: scene === 'marco' ? `${frameCm * ppc}px solid #1f1a14` : undefined,
          boxShadow: scene === 'poster' ? '0 6px 14px rgba(0,0,0,.25)' : '0 10px 24px rgba(0,0,0,.3)',
          boxSizing: 'border-box', transform: scene === 'poster' ? 'rotate(-0.6deg)' : undefined,
        }}>
          {thumb(wCm * ppc, hCm * ppc)}
          {scene === 'poster' && [0, 1].map((i) => (
            <span key={i} style={{ position: 'absolute', top: -6, [i ? 'right' : 'left']: bw * 0.08, width: Math.max(18, bw * 0.12), height: 12, background: 'rgba(255,255,240,.7)', transform: `rotate(${i ? 4 : -4}deg)` }} />
          ))}
        </div>
        <span className="size-note">{describeSize(f)} · sofá de 2,1 m como referencia</span>
      </div>
    );
  } else if (scene === 'pendon') {
    const floorFrac = 0.9;
    const standCm = 12;
    const sceneHcm = Math.max(230, (hCm + standCm + 20) / floorFrac);
    const ppc = Math.min(H / sceneHcm, W / Math.max(260, wCm * 2.4));
    const floorY = H * floorFrac;
    const bw = wCm * ppc, bh = hCm * ppc;
    const left = W / 2 - bw / 2 - 30 * ppc;
    body = (
      <div className="scene wall" style={{ display: 'block', background: 'linear-gradient(#eef0f3, #dfe3e8 90%, #b7bec8 90%)' }}>
        <div style={{ position: 'absolute', left, top: floorY - standCm * ppc - bh, boxShadow: '0 6px 16px rgba(0,0,0,.25)' }}>{thumb(bw, bh)}</div>
        <div style={{ position: 'absolute', left: left - 4 * ppc, top: floorY - standCm * ppc, width: bw + 8 * ppc, height: standCm * ppc, background: 'linear-gradient(#c9ced6, #8d95a1)', borderRadius: 4 }} />
        <Person x={left + bw + 25 * ppc} y={floorY - 170 * ppc} h={170 * ppc} />
        <span className="size-note">{describeSize(f)} · persona de 1,70 m como referencia</span>
      </div>
    );
  } else if (scene === 'celular') {
    const ph = H * 0.9, pw = ph * 0.49;
    body = (
      <div className="scene flat">
        <div style={{ width: pw, height: ph, borderRadius: pw * 0.14, background: '#0b0b0d', padding: pw * 0.04, boxShadow: '0 20px 40px rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', overflow: 'hidden', position: 'relative' }}>
          <div style={{ borderRadius: pw * 0.1, overflow: 'hidden', width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: '#000' }}>{thumb(pw * 0.92, ph * 0.95)}</div>
          <span style={{ position: 'absolute', top: pw * 0.07, width: pw * 0.28, height: pw * 0.07, borderRadius: 99, background: '#000' }} />
        </div>
        <span className="size-note">{describeSize(f)}</span>
      </div>
    );
  } else if (scene === 'pantalla') {
    const mw = W * 0.72, mh = mw * 0.5625;
    body = (
      <div className="scene flat" style={{ alignContent: 'center' }}>
        <div style={{ width: mw, height: mh, background: '#050505', border: `${mw * 0.015}px solid #111`, borderRadius: 8, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>{thumb(mw * 0.97, mh * 0.97)}</div>
        <div style={{ width: mw * 0.12, height: mh * 0.12, background: '#1c1c1f', margin: '0 auto' }} />
        <span className="size-note">{describeSize(f)}</span>
      </div>
    );
  }

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide" role="dialog" aria-modal="true" aria-labelledby="pp-title">
        <div className="modal-head">
          <h2 id="pp-title">Vista previa de impresión</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="modal-body">
          <div className="chips" style={{ marginBottom: 12 }}>
            {available.map((s) => <button key={s.id} className={`chip ${scene === s.id ? 'on' : ''}`} onClick={() => setScene(s.id)}>{s.label}</button>)}
          </div>
          <div ref={ref} style={{ width: '100%', position: 'relative', height: H }}>{W > 0 && body}</div>
          <p className="hint">Simulación a escala aproximada para que veas cómo quedaría físicamente. Los colores impresos pueden variar según el papel y la impresora.</p>
        </div>
      </div>
    </div>
  );
}
