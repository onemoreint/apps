import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { useStore } from '../store';
import { PlanSvg, type PickTarget } from '../render/PlanSvg';
import { STYLES } from '../render/styles';
import { overlaps, roomRect, snapR, EPS, wallLength } from '../geometry/rect';
import { footprint } from '../furniture/library';
import type { FurnitureItem, Opening, Room, WallSide } from '../geometry/types';
import { boundsFor, collides } from '../geometry/freeSpot';

type Drag =
  | { mode: 'room'; id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean }
  | { mode: 'edge'; id: string; edge: WallSide; sx: number; sy: number; orig: Room[]; neighbors: string[]; moved: boolean; origOpenings: Opening[]; origFurniture: FurnitureItem[] }
  | { mode: 'furniture'; id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean }
  | { mode: 'opening'; id: string; sx: number; sy: number; ooff: number; moved: boolean };

const MAGNET = 0.15;

export { boundsFor, collides, findFreeSpot } from '../geometry/freeSpot';

/** desplaza puertas/muebles para que conserven su posición global cuando cambia el origen del ambiente */
function keepContents(openings: Opening[], furniture: FurnitureItem[], room: Room, dx: number, dy: number) {
  const ops = openings.map((o) => {
    if (o.roomId !== room.id) return o;
    const along = o.wall === 'N' || o.wall === 'S' ? dx : dy;
    const len = wallLength(room, o.wall);
    return { ...o, offset: +Math.max(0, Math.min(len - o.width, o.offset - along)).toFixed(2) };
  });
  const fur = furniture.map((f) => {
    if (f.roomId !== room.id) return f;
    return { ...f, cx: +(f.cx - dx).toFixed(3), cy: +(f.cy - dy).toFixed(3) };
  });
  return { ops, fur };
}

export function Editor({ width, errorIds }: { width: number; errorIds: Set<string> }) {
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const showFurniture = useStore((s) => s.showFurniture);
  const showDims = useStore((s) => s.showDims);
  const select = useStore((s) => s.select);
  const checkpoint = useStore((s) => s.checkpoint);
  const patch = useStore((s) => s.patch);
  const geomRef = useRef<SVGGElement>(null);
  const drag = useRef<Drag | null>(null);
  const [dragging, setDragging] = useState(false);
  const style = STYLES[project.style];

  const toModel = useCallback((e: { clientX: number; clientY: number }) => {
    const g = geomRef.current;
    if (!g) return { x: 0, y: 0 };
    const m = g.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  }, []);

  const onPick = (e: RPointerEvent, t: PickTarget) => {
    if (e.button !== 0) return;
    const p = useStore.getState().project;
    const pt = toModel(e);
    if (t.kind === 'background') {
      select(null);
      return;
    }
    select({ kind: t.kind, id: t.id });
    if (t.kind === 'room') {
      const r = p.rooms.find((x) => x.id === t.id)!;
      drag.current = { mode: 'room', id: r.id, sx: pt.x, sy: pt.y, ox: r.x, oy: r.y, moved: false };
    } else if (t.kind === 'furniture') {
      const f = p.furniture.find((x) => x.id === t.id)!;
      drag.current = { mode: 'furniture', id: f.id, sx: pt.x, sy: pt.y, ox: f.cx, oy: f.cy, moved: false };
    } else if (t.kind === 'opening') {
      const o = p.openings.find((x) => x.id === t.id)!;
      drag.current = { mode: 'opening', id: o.id, sx: pt.x, sy: pt.y, ooff: o.offset, moved: false };
    }
    setDragging(true);
    (e.currentTarget as SVGElement).ownerSVGElement?.setPointerCapture?.(e.pointerId);
  };

  const startEdge = (e: RPointerEvent, room: Room, edge: WallSide) => {
    e.stopPropagation();
    const p = useStore.getState().project;
    const pt = toModel(e);
    const horizontal = edge === 'N' || edge === 'S';
    const line = edge === 'E' ? room.x + room.width : edge === 'W' ? room.x : edge === 'N' ? room.y + room.length : room.y;
    const neighbors = p.rooms.filter((o) => {
      if (o.id === room.id) return false;
      const oppLine = edge === 'E' ? o.x : edge === 'W' ? o.x + o.width : edge === 'N' ? o.y : o.y + o.length;
      if (Math.abs(oppLine - line) > EPS) return false;
      return horizontal
        ? Math.min(o.x + o.width, room.x + room.width) - Math.max(o.x, room.x) > 0.05
        : Math.min(o.y + o.length, room.y + room.length) - Math.max(o.y, room.y) > 0.05;
    });
    drag.current = { mode: 'edge', id: room.id, edge, sx: pt.x, sy: pt.y, orig: [room, ...neighbors], neighbors: neighbors.map((n) => n.id), moved: false, origOpenings: p.openings, origFurniture: p.furniture };
    setDragging(true);
    (e.currentTarget as SVGElement).ownerSVGElement?.setPointerCapture?.(e.pointerId);
  };

  const onMove = useCallback((e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const pt = toModel(e);
    const dx = pt.x - d.sx;
    const dy = pt.y - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 0.04) return;
    const p = useStore.getState().project;
    if (!d.moved) {
      checkpoint();
      d.moved = true;
    }

    if (d.mode === 'room') {
      const r = p.rooms.find((x) => x.id === d.id);
      if (!r) return;
      let nx = snapR(d.ox + dx);
      let ny = snapR(d.oy + dy);
      // imán a bordes de otros ambientes y del área construible
      const b = boundsFor(p, r);
      const xs = [b.x, b.x + b.w, ...p.rooms.filter((o) => o.id !== r.id).flatMap((o) => [o.x, o.x + o.width])];
      const ys = [b.y, b.y + b.h, ...p.rooms.filter((o) => o.id !== r.id).flatMap((o) => [o.y, o.y + o.length])];
      for (const x of xs) {
        if (Math.abs(nx - x) < MAGNET) { nx = x; break; }
        if (Math.abs(nx + r.width - x) < MAGNET) { nx = x - r.width; break; }
      }
      for (const y of ys) {
        if (Math.abs(ny - y) < MAGNET) { ny = y; break; }
        if (Math.abs(ny + r.length - y) < MAGNET) { ny = y - r.length; break; }
      }
      nx = Math.min(Math.max(nx, b.x), b.x + b.w - r.width);
      ny = Math.min(Math.max(ny, b.y), b.y + b.h - r.length);
      const ign = new Set([r.id]);
      const tries = [
        { x: nx, y: ny },
        { x: nx, y: r.y },
        { x: r.x, y: ny },
      ];
      const ok = tries.find((c) => !collides(p, { x: c.x, y: c.y, w: r.width, h: r.length }, ign));
      if (ok && (ok.x !== r.x || ok.y !== r.y)) {
        patch({ rooms: p.rooms.map((x) => (x.id === r.id ? { ...x, x: +ok.x.toFixed(2), y: +ok.y.toFixed(2) } : x)) });
      }
      return;
    }

    if (d.mode === 'edge') {
      const [room0, ...nb0] = d.orig;
      const horiz = d.edge === 'N' || d.edge === 'S';
      const delta = horiz ? dy : dx;
      const line0 = d.edge === 'E' ? room0.x + room0.width : d.edge === 'W' ? room0.x : d.edge === 'N' ? room0.y + room0.length : room0.y;
      const b = boundsFor(p, room0);
      let c = snapR(line0 + delta);
      const lo = horiz ? b.y : b.x;
      const hi = horiz ? b.y + b.h : b.x + b.w;
      c = Math.min(Math.max(c, lo), hi);
      const MIN = 0.6;
      const update = (r: Room, isMain: boolean): Room => {
        // el principal mueve su propio borde; los vecinos mueven el borde opuesto
        const side = isMain ? d.edge : ({ E: 'W', W: 'E', N: 'S', S: 'N' } as const)[d.edge];
        if (side === 'E') return { ...r, width: +(c - r.x).toFixed(2) };
        if (side === 'W') return { ...r, x: c, width: +(r.x + r.width - c).toFixed(2) };
        if (side === 'N') return { ...r, length: +(c - r.y).toFixed(2) };
        return { ...r, y: c, length: +(r.y + r.length - c).toFixed(2) };
      };
      const changed = [update(room0, true), ...nb0.map((n) => update(n, false))];
      if (changed.some((r) => r.width < MIN || r.length < MIN)) return;
      const ign = new Set(changed.map((r) => r.id));
      const others = p.rooms.filter((r) => !ign.has(r.id));
      if (changed.some((r) => others.some((o) => overlaps(roomRect(o), roomRect(r), 0.005)))) return;
      let ops = d.origOpenings;
      let fur = d.origFurniture;
      for (const r of changed) {
        const o = d.orig.find((x) => x.id === r.id)!;
        const k = keepContents(ops, fur, r, r.x - o.x, r.y - o.y);
        ops = k.ops;
        fur = k.fur;
      }
      patch({ rooms: p.rooms.map((r) => changed.find((x) => x.id === r.id) ?? r), openings: ops, furniture: fur });
      return;
    }

    if (d.mode === 'furniture') {
      const f = p.furniture.find((x) => x.id === d.id);
      const r = f && p.rooms.find((x) => x.id === f.roomId);
      if (!f || !r) return;
      const fp = footprint(f);
      const cx = Math.min(Math.max(snapR(d.ox + dx), fp.w / 2), r.width - fp.w / 2);
      const cy = Math.min(Math.max(snapR(d.oy + dy), fp.h / 2), r.length - fp.h / 2);
      patch({ furniture: p.furniture.map((x) => (x.id === f.id ? { ...x, cx, cy } : x)) });
      return;
    }

    if (d.mode === 'opening') {
      const o = p.openings.find((x) => x.id === d.id);
      const r = o && p.rooms.find((x) => x.id === o.roomId);
      if (!o || !r) return;
      const along = o.wall === 'N' || o.wall === 'S' ? dx : dy;
      const len = wallLength(r, o.wall);
      const off = Math.min(Math.max(snapR(d.ooff + along), 0), +(len - o.width).toFixed(2));
      patch({ openings: p.openings.map((x) => (x.id === o.id ? { ...x, offset: off } : x)) });
    }
  }, [checkpoint, patch, toModel]);

  const onUp = useCallback(() => {
    drag.current = null;
    setDragging(false);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, onMove, onUp]);

  const selRoom = selection?.kind === 'room' ? project.rooms.find((r) => r.id === selection.id) : undefined;
  const overlay = selRoom ? (
    <g>
      <rect x={selRoom.x} y={selRoom.y} width={selRoom.width} height={selRoom.length} fill="#0e7c86" fillOpacity={0.08} stroke="#0e7c86" strokeWidth={0.05} pointerEvents="none" />
      {(['N', 'S', 'E', 'W'] as WallSide[]).map((edge) => {
        const h = 0.34;
        const r = selRoom;
        const rect =
          edge === 'N' ? { x: r.x + 0.2, y: r.y + r.length - h / 2, width: r.width - 0.4, height: h }
          : edge === 'S' ? { x: r.x + 0.2, y: r.y - h / 2, width: r.width - 0.4, height: h }
          : edge === 'E' ? { x: r.x + r.width - h / 2, y: r.y + 0.2, width: h, height: r.length - 0.4 }
          : { x: r.x - h / 2, y: r.y + 0.2, width: h, height: r.length - 0.4 };
        const grip = edge === 'N' || edge === 'S'
          ? { cx: r.x + r.width / 2, cy: edge === 'N' ? r.y + r.length : r.y }
          : { cx: edge === 'E' ? r.x + r.width : r.x, cy: r.y + r.length / 2 };
        return (
          <g key={edge} style={{ cursor: edge === 'N' || edge === 'S' ? 'ns-resize' : 'ew-resize' }} onPointerDown={(e) => startEdge(e, r, edge)}>
            <rect {...rect} fill="transparent" />
            <rect x={grip.cx - 0.13} y={grip.cy - 0.13} width={0.26} height={0.26} fill="#ffffff" stroke="#0e7c86" strokeWidth={0.045} />
          </g>
        );
      })}
    </g>
  ) : null;

  return (
    <div className="canvas-inner" style={{ width }}>
      <PlanSvg
        project={project}
        style={style}
        mode="edit"
        className="plan-svg"
        showFurniture={showFurniture}
        showDims={showDims}
        selection={selection}
        errorIds={errorIds}
        onPick={onPick}
        overlay={overlay}
        geomRef={geomRef}
      />
    </div>
  );
}
