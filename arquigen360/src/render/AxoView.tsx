import { useMemo } from 'react';
import type { Project, Room } from '../geometry/types';
import { computeWalls } from '../geometry/walls';
import { wallSegment } from '../geometry/rect';
import { FURNITURE, footprint } from '../furniture/library';
import { CATALOG, FLOOR_CATEGORY } from '../layout-engine/catalog';
import type { PlanStyle } from './styles';

/*
 * Vista 2.5D: proyección ortográfica de la MISMA geometría del plano.
 * Nada se inventa aquí: muros, vanos, pisos y muebles salen del Project.
 */

interface Props {
  project: Project;
  style: PlanStyle;
  theta: number;
  elev: number;
  cut: number;
  showFurniture: boolean;
  showLabels?: boolean;
}

type P3 = [number, number, number];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(hex: string, f: number) {
  if (!hex.startsWith('#')) return hex;
  const [r, g, b] = hexToRgb(hex);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

interface Poly {
  pts: string;
  fill: string;
  depth: number;
  stroke?: string;
}

export function AxoView({ project: p, style, theta, elev, cut, showFurniture, showLabels = true }: Props) {
  const { width: W, length: L } = p.site;
  const data = useMemo(() => {
    const t = (theta * Math.PI) / 180;
    const e = (elev * Math.PI) / 180;
    const ct = Math.cos(t), st = Math.sin(t), se = Math.sin(e), ce = Math.cos(e);
    const rot = (x: number, y: number) => {
      const cx = x - W / 2;
      const cy = y - L / 2;
      return [cx * ct - cy * st, cx * st + cy * ct] as const;
    };
    const pr = ([x, y, z]: P3) => {
      const [xr, yr] = rot(x, y);
      return [xr, -(yr * se + z * ce)] as const;
    };
    const depthOf = (x: number, y: number) => rot(x, y)[1];
    const ptsStr = (ps: P3[]) => ps.map((q) => pr(q).map((v) => v.toFixed(3)).join(',')).join(' ');

    /** caras visibles de un prisma rectangular alineado a ejes */
    const prism = (x: number, y: number, w: number, d: number, z0: number, z1: number, top: string, side: string, out: Poly[], depthBias = 0) => {
      if (w <= 0 || d <= 0 || z1 <= z0) return;
      const c: [number, number][] = [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
      const normals: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      const faces: Poly[] = [];
      for (let i = 0; i < 4; i++) {
        const [nx, ny] = normals[i];
        const nyr = nx * st + ny * ct;
        if (nyr >= 0) continue;
        const nxr = nx * ct - ny * st;
        const a = c[i];
        const b = c[(i + 1) % 4];
        faces.push({
          pts: ptsStr([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]]),
          fill: shade(side, 0.8 + 0.14 * nxr),
          depth: 0,
        });
      }
      faces.push({ pts: ptsStr(c.map(([cx, cy]) => [cx, cy, z1] as P3)), fill: top, depth: 0 });
      const depth = depthOf(x + w / 2, y + d / 2) + depthBias;
      out.push(...faces.map((f) => ({ ...f, depth })));
    };

    const ground: Poly[] = [];
    prism(0, 0, W, L, -0.35, 0, style.ground, style.slab, ground);

    const floors: Poly[] = p.rooms.map((r) => ({
      pts: ptsStr([[r.x, r.y, 0.01], [r.x + r.width, r.y, 0.01], [r.x + r.width, r.y + r.length, 0.01], [r.x, r.y + r.length, 0.01]]),
      fill: style.floors[FLOOR_CATEGORY[r.type]].fill,
      stroke: style.floors[FLOOR_CATEGORY[r.type]].line,
      depth: 0,
    }));

    const solids: Poly[] = [];
    // muros con vanos
    const walls = computeWalls(p.rooms, p.program.preferences).filter((w) => w.kind !== 'open');
    const roomsById = new Map(p.rooms.map((r) => [r.id, r]));
    const ops = p.openings
      .map((o) => {
        const r = roomsById.get(o.roomId);
        return r ? { o, seg: wallSegment(r, o.wall, o.offset, o.width) } : null;
      })
      .filter(Boolean) as { o: (typeof p.openings)[number]; seg: ReturnType<typeof wallSegment> }[];
    const wallTop = style.wall;
    const wallSide = style.id === 'tecnico' ? '#e8eaed' : '#f1eee9';
    for (const w of walls) {
      const horiz = w.orient === 'h';
      const at = horiz ? w.y1 : w.x1;
      const s0 = horiz ? w.x1 : w.y1;
      const e0 = horiz ? w.x2 : w.y2;
      const t = w.thick;
      // cortes por vanos
      const cuts = ops
        .filter(({ seg }) => (horiz ? Math.abs(seg.y1 - at) < 0.01 && seg.y1 === seg.y2 : Math.abs(seg.x1 - at) < 0.01 && seg.x1 === seg.x2))
        .map(({ o, seg }) => ({ o, s: horiz ? seg.x1 : seg.y1, e: horiz ? seg.x2 : seg.y2 }))
        .filter((c) => c.e > s0 && c.s < e0)
        .sort((a, b) => a.s - b.s);
      const pieces: { s: number; e: number; z0: number; z1: number }[] = [];
      let cur = s0 - t / 2;
      for (const c of cuts) {
        const cs = Math.max(c.s, s0);
        const ceE = Math.min(c.e, e0);
        if (cs > cur) pieces.push({ s: cur, e: cs, z0: 0, z1: cut });
        if (c.o.kind === 'window') {
          pieces.push({ s: cs, e: ceE, z0: 0, z1: Math.min(cut, 0.9) });
          if (cut > 2.1) pieces.push({ s: cs, e: ceE, z0: 2.1, z1: cut });
        } else if (cut > 2.1) pieces.push({ s: cs, e: ceE, z0: 2.1, z1: cut });
        cur = Math.max(cur, ceE);
      }
      if (e0 + t / 2 > cur) pieces.push({ s: cur, e: e0 + t / 2, z0: 0, z1: cut });
      for (const pc of pieces) {
        if (horiz) prism(pc.s, at - t / 2, pc.e - pc.s, t, pc.z0, pc.z1, wallTop, wallSide, solids);
        else prism(at - t / 2, pc.s, t, pc.e - pc.s, pc.z0, pc.z1, wallTop, wallSide, solids);
      }
      // vidrio de ventanas
      for (const c of cuts.filter((c) => c.o.kind === 'window')) {
        const cs = Math.max(c.s, s0);
        const ce2 = Math.min(c.e, e0);
        const top = Math.min(cut, 2.1);
        if (top > 0.9) {
          if (horiz) prism(cs, at - 0.02, ce2 - cs, 0.04, 0.9, top, style.glass, style.glass, solids);
          else prism(at - 0.02, cs, 0.04, ce2 - cs, 0.9, top, style.glass, style.glass, solids);
        }
      }
    }

    // mobiliario
    const trees: { x: number; y: number; r: number; depth: number }[] = [];
    if (showFurniture) {
      for (const f of p.furniture) {
        const r = roomsById.get(f.roomId) as Room | undefined;
        if (!r) continue;
        const fp = footprint(f);
        const def = FURNITURE[f.kind];
        const gx = r.x + fp.x;
        const gy = r.y + fp.y;
        if (f.kind === 'tree' || f.kind === 'plant') {
          trees.push({ x: gx + fp.w / 2, y: gy + fp.h / 2, r: fp.w / 2, depth: depthOf(gx + fp.w / 2, gy + fp.h / 2) });
          continue;
        }
        const col = f.kind.startsWith('bed') || f.kind.startsWith('sofa') ? style.furnAccent : f.kind === 'car' ? style.car : style.furnFill;
        const h = Math.min(def.h, Math.max(cut - 0.05, 0.4));
        if (f.kind === 'upper_cabinets') continue;
        if (f.kind.startsWith('table')) {
          const tw = (f.rotation % 180 ? def.d : (f.w ?? def.w)) - (f.rotation % 180 ? 0.5 : 0.6);
          const td = (f.rotation % 180 ? (f.w ?? def.w) : def.d) - (f.rotation % 180 ? 0.6 : 0.5);
          prism(gx + (fp.w - tw) / 2, gy + (fp.h - td) / 2, tw, td, 0.7, 0.76, style.furnSoft, style.furnStroke, solids);
          prism(gx + (fp.w - tw) / 2 + 0.05, gy + (fp.h - td) / 2 + 0.05, tw - 0.1, td - 0.1, 0, 0.7, shade(style.furnSoft, 0.8), shade(style.furnSoft, 0.7), solids, -0.01);
          continue;
        }
        if (f.kind === 'car') {
          prism(gx + 0.02, gy + 0.02, fp.w - 0.04, fp.h - 0.04, 0.15, 0.8, col, col, solids);
          const inset = 0.25;
          const long = fp.h > fp.w;
          prism(gx + (long ? 0.12 : 1.0), gy + (long ? 1.0 : 0.12), long ? fp.w - 0.24 : fp.w - 2.0 - inset, long ? fp.h - 2.0 - inset : fp.h - 0.24, 0.8, 1.4, style.glass, shade(col, 0.9), solids, -0.02);
          continue;
        }
        prism(gx, gy, fp.w, fp.h, 0, h, col, col, solids);
      }
    }

    // proyección de los límites para encuadrar
    const corners: P3[] = [];
    for (const [x, y] of [[0, 0], [W, 0], [W, L], [0, L]] as [number, number][]) corners.push([x, y, -0.35], [x, y, Math.max(cut, 3.5)]);
    const pts = corners.map(pr);
    const minX = Math.min(...pts.map((q) => q[0])) - 0.8;
    const maxX = Math.max(...pts.map((q) => q[0])) + 0.8;
    const minY = Math.min(...pts.map((q) => q[1])) - 0.8;
    const maxY = Math.max(...pts.map((q) => q[1])) + 0.8;

    solids.sort((a, b) => b.depth - a.depth);
    trees.sort((a, b) => b.depth - a.depth);
    const labels = p.rooms.map((r) => {
      const [x, y] = pr([r.x + r.width / 2, r.y + r.length / 2, 0.05]);
      return { x, y, name: r.name, covered: CATALOG[r.type].covered };
    });
    const treeShapes = trees.map((tr) => {
      const [gx, gy] = pr([tr.x, tr.y, 0]);
      const big = tr.r > 0.6;
      const [cx, cy] = pr([tr.x, tr.y, big ? 3.0 : 0.7]);
      return { gx, gy, cx, cy, r: tr.r, big, depth: tr.depth };
    });
    return { ground, floors, solids, labels, treeShapes, vb: { x: minX, y: minY, w: maxX - minX, h: maxY - minY }, se };
  }, [p, style, theta, elev, cut, showFurniture, W, L]);

  const { vb } = data;
  return (
    <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} xmlns="http://www.w3.org/2000/svg" className="axo-svg">
      <defs>
        <filter id="axo-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx={0.18} dy={0.22} stdDeviation={0.16} floodColor="#000" floodOpacity={0.22} />
        </filter>
      </defs>
      <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill={style.paper} />
      <g filter="url(#axo-shadow)">
        {data.ground.map((q, i) => <polygon key={`g${i}`} points={q.pts} fill={q.fill} />)}
      </g>
      {data.floors.map((q, i) => <polygon key={`f${i}`} points={q.pts} fill={q.fill} stroke={q.stroke} strokeWidth={0.02} />)}
      <g filter={style.shadow ? 'url(#axo-shadow)' : undefined}>
        {data.solids.map((q, i) => <polygon key={`s${i}`} points={q.pts} fill={q.fill} stroke={shade(q.fill.startsWith('#') ? q.fill : '#888888', 0.75)} strokeWidth={0.008} strokeLinejoin="round" />)}
      </g>
      {data.treeShapes.map((t, i) => (
        <g key={`t${i}`}>
          <ellipse cx={t.gx + 0.3} cy={t.gy + 0.1} rx={t.r * 0.95} ry={t.r * 0.95 * data.se} fill="#000" opacity={0.14} />
          {t.big && <path d={`M${t.gx} ${t.gy}L${t.cx} ${t.cy}`} stroke="#6b4f3a" strokeWidth={0.12} />}
          <circle cx={t.cx} cy={t.cy} r={t.r * (t.big ? 0.9 : 0.8)} fill={style.tree} stroke={style.treeDark} strokeWidth={0.03} opacity={0.93} />
          <circle cx={t.cx - t.r * 0.25} cy={t.cy - t.r * 0.25} r={t.r * 0.35} fill="#fff" opacity={0.12} />
        </g>
      ))}
      {showLabels && (
        <g fontFamily="'IBM Plex Sans', Arial, sans-serif" textAnchor="middle" pointerEvents="none">
          {data.labels.map((l, i) => (
            <text key={i} x={l.x} y={l.y} fontSize={0.26} fontWeight={600} fill={style.text} stroke={style.halo} strokeWidth={0.09} paintOrder="stroke" fontStyle={l.covered ? undefined : 'italic'}>
              {l.name}
            </text>
          ))}
        </g>
      )}
    </svg>
  );
}
