import { useState } from 'react';
import { useStore } from '../store';
import { CATALOG } from '../layout-engine/catalog';
import { FURNITURE, FURNITURE_LIST, footprint } from '../furniture/library';
import { wallLength } from '../geometry/rect';
import type { FurnitureKind, OpeningKind, Room, WallSide } from '../geometry/types';
import { Icon, NumberField, Section, Seg } from './ui';
import { ZONE_COLOR, ZONE_LABEL } from './ProgramPanel';
import { findFreeSpot } from './Editor';

export const WALL_LABEL: Record<WallSide, string> = { N: 'Superior', S: 'Inferior', E: 'Derecho', W: 'Izquierdo' };
const KIND_LABEL: Record<OpeningKind, string> = { door: 'Puerta', window: 'Ventana', garage_door: 'Portón de garaje' };

export function Inspector({ hasOverlap }: { hasOverlap: boolean }) {
  const selection = useStore((s) => s.selection);
  const project = useStore((s) => s.project);

  if (!selection) {
    return (
      <Section title="Inspector">
        <p className="empty">
          Selecciona un ambiente, una puerta, una ventana o un mueble en el plano. Arrastra un ambiente para moverlo y
          los cuadros blancos de sus bordes para mover muros; el ambiente vecino se ajusta solo.
        </p>
        <p className="hint">
          <span className="kbd">Supr</span> elimina · <span className="kbd">←↑→↓</span> mueve 5 cm (<span className="kbd">Shift</span> 50 cm) ·{' '}
          <span className="kbd">Ctrl Z</span> deshace · <span className="kbd">Ctrl Y</span> rehace
        </p>
      </Section>
    );
  }
  if (selection.kind === 'room') {
    const r = project.rooms.find((x) => x.id === selection.id);
    return r ? <RoomInspector room={r} hasOverlap={hasOverlap} /> : null;
  }
  if (selection.kind === 'opening') return <OpeningInspector id={selection.id} />;
  return <FurnitureInspector id={selection.id} />;
}

function RoomInspector({ room: r, hasOverlap }: { room: Room; hasOverlap: boolean }) {
  const project = useStore((s) => s.project);
  const { updateRoom, checkpoint, deleteRoom, duplicateRoom, refurnishRoom, addOpening, addFurniture, select, generate } = useStore.getState();
  const [wall, setWall] = useState<WallSide>('S');
  const zone = CATALOG[r.type].zone;
  const set = (patch: Partial<Room>) => {
    checkpoint();
    updateRoom(r.id, patch);
  };
  const openings = project.openings.filter((o) => o.roomId === r.id);
  const furniture = project.furniture.filter((f) => f.roomId === r.id);

  const addOp = (kind: OpeningKind) => {
    const len = wallLength(r, wall);
    const width = kind === 'window' ? Math.min(1.2, len - 0.4) : kind === 'garage_door' ? Math.min(2.6, len - 0.4) : Math.min(0.8, len - 0.3);
    if (width < 0.4) return;
    addOpening({ kind, roomId: r.id, wall, offset: +((len - width) / 2).toFixed(2), width: +width.toFixed(2), swing: 'in', hinge: 'start' });
  };

  return (
    <>
      <Section title="Ambiente" aside={<span style={{ display: 'flex', alignItems: 'center', gap: 6, textTransform: 'none', letterSpacing: 0 }}><span className="zone-dot" style={{ background: ZONE_COLOR[zone] }} />{ZONE_LABEL[zone]}</span>}>
        <label className="field" htmlFor="room-name">
          <span>Nombre</span>
          <input id="room-name" className="input" value={r.name} onFocus={checkpoint} onChange={(e) => updateRoom(r.id, { name: e.target.value })} />
        </label>
        <div className="grid2">
          <NumberField id="room-w" label="Ancho" value={r.width} min={0.6} max={40} onCommit={(v) => set({ width: v })} />
          <NumberField id="room-l" label="Largo" value={r.length} min={0.6} max={60} onCommit={(v) => set({ length: v })} />
          <NumberField id="room-x" label="Posición X" value={r.x} min={0} max={project.site.width} onCommit={(v) => set({ x: v })} />
          <NumberField id="room-y" label="Posición Y" value={r.y} min={0} max={project.site.length} onCommit={(v) => set({ y: v })} />
        </div>
        <dl className="summary-box">
          <dt>Área</dt><dd>{(r.width * r.length).toFixed(2)} m²</dd>
          <dt>Tipo</dt><dd style={{ fontFamily: 'var(--sans)' }}>{CATALOG[r.type].label}</dd>
        </dl>
        {hasOverlap && (
          <>
            <p className="hint" style={{ color: 'var(--err)' }}>Hay ambientes superpuestos. Puedes volver a distribuir usando las medidas actuales como mínimos.</p>
            <button className="btn primary" type="button" onClick={() => generate({ keepSizes: true })}>Redistribuir con estas medidas</button>
          </>
        )}
        <div className="inspector-actions">
          <button className="btn small" type="button" onClick={() => duplicateRoom(r.id, findFreeSpot(project, r.width, r.length, CATALOG[r.type].covered))}><Icon name="copy" /> Duplicar</button>
          <button className="btn small" type="button" onClick={() => refurnishRoom(r.id)}><Icon name="sofa" /> Amoblar</button>
          <button className="btn small danger" type="button" onClick={() => deleteRoom(r.id)}><Icon name="trash" /> Eliminar</button>
        </div>
      </Section>

      <Section title={`Puertas y ventanas (${openings.length})`}>
        <div className="op-list">
          {openings.map((o) => (
            <button key={o.id} type="button" className="op-row" onClick={() => select({ kind: 'opening', id: o.id })}>
              <span>{KIND_LABEL[o.kind]} · muro {WALL_LABEL[o.wall].toLowerCase()}</span>
              <code>{o.width.toFixed(2)} m</code>
            </button>
          ))}
        </div>
        <div className="field">
          <span>Agregar en el muro</span>
          <Seg label="Muro" value={wall} onChange={setWall} options={(['S', 'N', 'W', 'E'] as WallSide[]).map((w) => ({ value: w, label: WALL_LABEL[w] }))} />
        </div>
        <div className="inspector-actions">
          <button className="btn small" type="button" onClick={() => addOp('door')}><Icon name="door" /> Puerta</button>
          <button className="btn small" type="button" onClick={() => addOp('window')}><Icon name="window" /> Ventana</button>
          {r.type === 'garage' && <button className="btn small" type="button" onClick={() => addOp('garage_door')}>Portón</button>}
        </div>
      </Section>

      <Section title={`Mobiliario (${furniture.length})`}>
        <select
          className="select"
          aria-label="Agregar mueble"
          value=""
          onChange={(e) => {
            const kind = e.target.value as FurnitureKind;
            if (!kind) return;
            const def = FURNITURE[kind];
            addFurniture({ roomId: r.id, kind, cx: +(r.width / 2).toFixed(2), cy: +(Math.min(r.length - def.d / 2, r.length / 2)).toFixed(2), rotation: 0 });
          }}
        >
          <option value="">+ Agregar mueble…</option>
          {['Dormitorio', 'Sala', 'Comedor', 'Cocina', 'Baño', 'Servicio', 'Exterior'].map((g) => (
            <optgroup key={g} label={g}>
              {FURNITURE_LIST.filter((f) => f.group === g).map((f) => (
                <option key={f.kind} value={f.kind}>{f.label} · {f.w.toFixed(2)} × {f.d.toFixed(2)}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="op-list">
          {furniture.map((f) => (
            <button key={f.id} type="button" className="op-row" onClick={() => select({ kind: 'furniture', id: f.id })}>
              <span>{FURNITURE[f.kind].label}</span>
              <code>{(f.w ?? FURNITURE[f.kind].w).toFixed(2)} × {FURNITURE[f.kind].d.toFixed(2)}</code>
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}

function OpeningInspector({ id }: { id: string }) {
  const project = useStore((s) => s.project);
  const { updateOpening, checkpoint, deleteOpening, select } = useStore.getState();
  const o = project.openings.find((x) => x.id === id);
  const r = o && project.rooms.find((x) => x.id === o.roomId);
  if (!o || !r) return null;
  const len = wallLength(r, o.wall);
  const set = (patch: Partial<typeof o>) => {
    checkpoint();
    updateOpening(o.id, patch);
  };
  return (
    <Section title={KIND_LABEL[o.kind]} aside={<button className="btn small ghost" type="button" onClick={() => select({ kind: 'room', id: r.id })}>{r.name}</button>}>
      <label className="field" htmlFor="op-kind">
        <span>Tipo</span>
        <select id="op-kind" className="select" value={o.kind} onChange={(e) => set({ kind: e.target.value as OpeningKind })}>
          <option value="door">Puerta</option>
          <option value="window">Ventana</option>
          <option value="garage_door">Portón de garaje</option>
        </select>
      </label>
      <div className="field">
        <span>Muro de {r.name}</span>
        <Seg label="Muro" value={o.wall} onChange={(w) => set({ wall: w, offset: Math.max(0, Math.min(o.offset, wallLength(r, w) - o.width)) })}
          options={(['S', 'N', 'W', 'E'] as WallSide[]).map((w) => ({ value: w, label: WALL_LABEL[w] }))} />
      </div>
      <div className="grid2">
        <NumberField id="op-w" label="Ancho" value={o.width} min={0.4} max={len} onCommit={(v) => set({ width: v, offset: Math.min(o.offset, +(len - v).toFixed(2)) })} />
        <NumberField id="op-off" label="Distancia al inicio" value={o.offset} min={0} max={+(len - o.width).toFixed(2)} onCommit={(v) => set({ offset: v })} />
      </div>
      {o.kind === 'door' && (
        <div className="inspector-actions">
          <button className="btn small" type="button" onClick={() => set({ swing: o.swing === 'in' ? 'out' : 'in' })}><Icon name="rotate" /> Invertir apertura</button>
          <button className="btn small" type="button" onClick={() => set({ hinge: o.hinge === 'start' ? 'end' : 'start' })}>Cambiar bisagra</button>
        </div>
      )}
      <p className="hint">Arrastra la abertura en el plano para desplazarla sobre su muro.</p>
      <button className="btn small danger" type="button" onClick={() => deleteOpening(o.id)}><Icon name="trash" /> Eliminar</button>
    </Section>
  );
}

function FurnitureInspector({ id }: { id: string }) {
  const project = useStore((s) => s.project);
  const { updateFurniture, checkpoint, deleteFurniture, select } = useStore.getState();
  const f = project.furniture.find((x) => x.id === id);
  const r = f && project.rooms.find((x) => x.id === f.roomId);
  if (!f || !r) return null;
  const def = FURNITURE[f.kind];
  const clampInside = (next: typeof f) => {
    const fp = footprint(next);
    return { ...next, cx: Math.min(Math.max(next.cx, fp.w / 2), r.width - fp.w / 2), cy: Math.min(Math.max(next.cy, fp.h / 2), r.length - fp.h / 2) };
  };
  const set = (patch: Partial<typeof f>) => {
    checkpoint();
    const n = clampInside({ ...f, ...patch });
    updateFurniture(f.id, n);
  };
  return (
    <Section title={def.label} aside={<button className="btn small ghost" type="button" onClick={() => select({ kind: 'room', id: r.id })}>{r.name}</button>}>
      <div className="grid2">
        <NumberField id="fu-x" label="Centro X (en ambiente)" value={f.cx} min={0} max={r.width} onCommit={(v) => set({ cx: v })} />
        <NumberField id="fu-y" label="Centro Y (en ambiente)" value={f.cy} min={0} max={r.length} onCommit={(v) => set({ cy: v })} />
        {def.resizable && <NumberField id="fu-w" label="Largo" value={f.w ?? def.w} min={0.4} max={6} onCommit={(v) => set({ w: v })} />}
      </div>
      <p className="hint">Medida real: {(f.w ?? def.w).toFixed(2)} × {def.d.toFixed(2)} m. Arrastra el mueble para moverlo dentro del ambiente.</p>
      <div className="inspector-actions">
        <button className="btn small" type="button" onClick={() => set({ rotation: (((f.rotation + 90) % 360) as 0 | 90 | 180 | 270) })}><Icon name="rotate" /> Girar 90°</button>
        <button className="btn small danger" type="button" onClick={() => deleteFurniture(f.id)}><Icon name="trash" /> Eliminar</button>
      </div>
    </Section>
  );
}
