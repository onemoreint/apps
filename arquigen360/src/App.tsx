import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, type View } from './store';
import { TopBar, type ExportTarget } from './components/TopBar';
import { SitePanel } from './components/SitePanel';
import { ProgramPanel } from './components/ProgramPanel';
import { AssistantPanel } from './components/AssistantPanel';
import { Editor, boundsFor, collides, findFreeSpot } from './components/Editor';
import { RightPanel } from './components/RightPanel';
import { Icon } from './components/ui';
import { AxoView } from './render/AxoView';
import { Sheet } from './render/Sheet';
import { PlanSvg, planViewBox } from './render/PlanSvg';
import { STYLES, STYLE_LIST } from './render/styles';
import { computeAreas, validate } from './layout-engine/validate';
import { CATALOG, SELECTABLE } from './layout-engine/catalog';
import { rasterize, saveFile, serializeSvg, slug, toPdf } from './export/export';
import type { RoomType, StyleId } from './geometry/types';
import { snapR } from './geometry/rect';

type LeftTab = 'site' | 'program' | 'ai';

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

export default function App() {
  const project = useStore((s) => s.project);
  const view = useStore((s) => s.view);
  const notes = useStore((s) => s.notes);
  const toast = useStore((s) => s.toast);
  const showFurniture = useStore((s) => s.showFurniture);
  const showDims = useStore((s) => s.showDims);
  const { setView, setStyle, toggle, generate, addRoom, notify } = useStore.getState();
  const [tab, setTab] = useState<LeftTab>('program');
  const [zoom, setZoom] = useState(1);
  const [axo, setAxo] = useState({ theta: -28, elev: 48, cut: 1.5 });
  const [exporting, setExporting] = useState(false);
  const sheetRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 900, h: 700 });
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const planRef = useRef<SVGSVGElement>(null);

  const issues = useMemo(() => validate(project), [project]);
  const areas = useMemo(() => computeAreas(project), [project]);
  const errorIds = useMemo(() => new Set(issues.filter((i) => i.level === 'error').flatMap((i) => i.roomIds)), [issues]);
  const style = STYLES[project.style];
  const vb = planViewBox(project);
  const fitW = (aspect: number) => Math.max(260, Math.min(box.w, box.h > 200 && window.innerWidth > 760 ? box.h * aspect : box.w));
  const planWidth = fitW(vb.w / vb.h) * zoom;

  // atajos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]')) return;
      const s = useStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) s.redo(); else s.undo(); return; }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); s.redo(); return; }
      const sel = s.selection;
      if (!sel) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (sel.kind === 'room') s.deleteRoom(sel.id);
        else if (sel.kind === 'opening') s.deleteOpening(sel.id);
        else s.deleteFurniture(sel.id);
        return;
      }
      if (e.key === 'Escape') { s.select(null); return; }
      const dirs: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
      const d = dirs[e.key];
      if (d && sel.kind === 'room') {
        e.preventDefault();
        const step = e.shiftKey ? 0.5 : 0.05;
        const p = s.project;
        const r = p.rooms.find((x) => x.id === sel.id);
        if (!r) return;
        const b = boundsFor(p, r);
        const nx = snapR(Math.min(Math.max(r.x + d[0] * step, b.x), b.x + b.w - r.width));
        const ny = snapR(Math.min(Math.max(r.y + d[1] * step, b.y), b.y + b.h - r.length));
        if (!collides(p, { x: nx, y: ny, w: r.width, h: r.length }, new Set([r.id]))) {
          s.checkpoint();
          s.updateRoom(r.id, { x: nx, y: ny });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onExport = async (t: ExportTarget) => {
    const p = useStore.getState().project;
    const base = slug(p.name);
    if (t === 'json') {
      await saveFile(`${base}.arquigen.json`, new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' }));
      return;
    }
    setExporting(true);
    await nextFrame();
    try {
      const sheet = sheetRef.current;
      const plan = planRef.current;
      if (!sheet || !plan) throw new Error('No se pudo preparar la exportación.');
      let blob: Blob;
      let name: string;
      switch (t) {
        case 'sheet-png': blob = await rasterize(sheet, 4200, 'image/png'); name = `${base}-lamina.png`; break;
        case 'sheet-jpg': blob = await rasterize(sheet, 4200, 'image/jpeg'); name = `${base}-lamina.jpg`; break;
        case 'sheet-pdf': blob = await toPdf(sheet); name = `${base}-lamina.pdf`; break;
        case 'sheet-svg': blob = new Blob([serializeSvg(sheet)], { type: 'image/svg+xml' }); name = `${base}-lamina.svg`; break;
        case 'plan-png': blob = await rasterize(plan, 3000, 'image/png'); name = `${base}-plano.png`; break;
        default: blob = new Blob([serializeSvg(plan)], { type: 'image/svg+xml' }); name = `${base}-plano.svg`;
      }
      const res = await saveFile(name, blob);
      if (res === 'saved') notify(`Exportado: ${name}`);
    } finally {
      setExporting(false);
    }
  };

  const addRoomOfType = (type: RoomType) => {
    const c = CATALOG[type];
    const spot = findFreeSpot(project, c.minWidth, c.minLength, c.covered);
    addRoom({ type, name: c.label, x: spot.x, y: spot.y, width: c.minWidth, length: c.minLength });
  };

  const views: { id: View; label: string }[] = [
    { id: 'plan', label: 'Plano 2D' },
    { id: 'axo', label: 'Vista 2.5D' },
    { id: 'sheet', label: 'Lámina' },
  ];

  return (
    <div className="app">
      <TopBar onExport={onExport} />

      <aside className="side" aria-label="Datos del proyecto">
        <div className="tabs" role="tablist">
          {([['site', 'Terreno'], ['program', 'Programa'], ['ai', 'Asistente IA']] as [LeftTab, string][]).map(([id, label]) => (
            <button key={id} id={`tab-${id}`} className="tab" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <div className="scroll" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === 'site' && <SitePanel />}
          {tab === 'program' && <ProgramPanel />}
          {tab === 'ai' && <AssistantPanel onApplied={() => setView('plan')} />}
        </div>
        <div className="side-foot">
          <button className="btn primary" type="button" onClick={() => { generate(); setView('plan'); notify('Distribución generada'); }}>
            <Icon name="grid" /> Generar distribución
          </button>
          <p className="hint">Genera de nuevo desde el terreno y el programa. Las ediciones manuales se reemplazan (puedes deshacer).</p>
        </div>
      </aside>

      <main className="center">
        <div className="center-bar">
          <div className="seg" role="tablist" aria-label="Vista">
            {views.map((v) => (
              <button key={v.id} type="button" role="tab" aria-pressed={view === v.id} aria-selected={view === v.id} onClick={() => setView(v.id)}>{v.label}</button>
            ))}
          </div>
          <select className="select" style={{ width: 'auto' }} aria-label="Estilo visual" value={project.style} onChange={(e) => setStyle(e.target.value as StyleId)}>
            {STYLE_LIST.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <label className="check"><input type="checkbox" checked={showFurniture} onChange={() => toggle('showFurniture')} /> Mobiliario</label>
          <label className="check"><input type="checkbox" checked={showDims} onChange={() => toggle('showDims')} /> Cotas</label>
          <span className="spacer" />
          {view === 'plan' && (
            <>
              <select className="select" style={{ width: 'auto' }} aria-label="Agregar ambiente al plano" value="" onChange={(e) => e.target.value && addRoomOfType(e.target.value as RoomType)}>
                <option value="">+ Ambiente</option>
                {[...SELECTABLE, 'hall' as RoomType].map((t) => <option key={t} value={t}>{CATALOG[t].label}</option>)}
              </select>
              <div className="seg" role="group" aria-label="Zoom">
                <button type="button" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label="Alejar"><Icon name="minus" /></button>
                <button type="button" onClick={() => setZoom(1)} style={{ fontFamily: 'var(--mono)', minWidth: 52 }}>{Math.round(zoom * 100)}%</button>
                <button type="button" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} aria-label="Acercar"><Icon name="plus" /></button>
              </div>
            </>
          )}
        </div>

        {view === 'axo' && (
          <div className="axo-controls">
            <label>Giro <input type="range" min={-80} max={80} value={axo.theta} onChange={(e) => setAxo({ ...axo, theta: +e.target.value })} /> <code>{axo.theta}°</code></label>
            <label>Inclinación <input type="range" min={25} max={80} value={axo.elev} onChange={(e) => setAxo({ ...axo, elev: +e.target.value })} /> <code>{axo.elev}°</code></label>
            <label>Corte de muros <input type="range" min={0.6} max={2.6} step={0.1} value={axo.cut} onChange={(e) => setAxo({ ...axo, cut: +e.target.value })} /> <code>{axo.cut.toFixed(1)} m</code></label>
          </div>
        )}

        {notes.length > 0 && view === 'plan' && (
          <div className="notes">
            {notes.map((n) => <div key={n} className="note">{n}</div>)}
          </div>
        )}

        <div className="canvas-wrap" ref={wrapRef}>
          {view === 'plan' && <Editor width={planWidth} errorIds={errorIds} />}
          {view === 'axo' && (
            <div className="canvas-inner" style={{ width: Math.min(box.w, 1100) }}>
              <AxoView project={project} style={style} theta={axo.theta} elev={axo.elev} cut={axo.cut} showFurniture={showFurniture} />
            </div>
          )}
          {view === 'sheet' && (
            <div className="canvas-inner" style={{ width: fitW(420 / 297) }}>
              <Sheet project={project} style={style} showFurniture={showFurniture} />
            </div>
          )}
        </div>
      </main>

      <RightPanel issues={issues} areas={areas} />

      {exporting && (
        <div className="offscreen" aria-hidden="true">
          <Sheet project={project} style={style} svgRef={sheetRef} showFurniture={showFurniture} />
          <PlanSvg project={project} style={style} mode="print" svgRef={planRef} showFurniture={showFurniture} showDims={showDims} />
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
