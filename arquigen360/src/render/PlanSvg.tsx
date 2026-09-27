import { useMemo, type PointerEvent as RPointerEvent, type ReactNode, type Ref } from 'react';
import type { Opening, Project, Room, WallSide } from '../geometry/types';
import { computeWalls } from '../geometry/walls';
import { computeDimensions } from '../geometry/dimensions';
import { wallSegment } from '../geometry/rect';
import { CATALOG, FLOOR_CATEGORY } from '../layout-engine/catalog';
import { buildableRect } from '../geometry/site';
import type { PlanStyle } from './styles';
import { FurnitureSymbol, StyleDefs, patternId } from './symbols';

export type Selection = { kind: 'room' | 'opening' | 'furniture'; id: string } | null;
export type PickTarget = { kind: 'room' | 'opening' | 'furniture'; id: string } | { kind: 'background' };

export const PLAN_MARGIN = { left: 3.0, right: 1.8, top: 1.8, bottom: 3.0 };

export function planViewBox(p: Project) {
  const { width: W, length: L } = p.site;
  return { x: -PLAN_MARGIN.left, y: -PLAN_MARGIN.top, w: W + PLAN_MARGIN.left + PLAN_MARGIN.right, h: L + PLAN_MARGIN.top + PLAN_MARGIN.bottom };
}

interface Props {
  project: Project;
  style: PlanStyle;
  mode: 'edit' | 'print';
  showFurniture?: boolean;
  showDims?: boolean;
  selection?: Selection;
  errorIds?: Set<string>;
  onPick?: (e: RPointerEvent, t: PickTarget) => void;
  overlay?: ReactNode;
  svgRef?: Ref<SVGSVGElement>;
  geomRef?: Ref<SVGGElement>;
  className?: string;
  /** para incrustar en la lámina */
  nested?: { x: number; y: number; width: number; height: number };
  fontFamily?: string;
  hideNorth?: boolean;
}

const NORMAL: Record<WallSide, [number, number]> = { S: [0, 1], N: [0, -1], W: [1, 0], E: [-1, 0] };

function OpeningShape({ o, room, style, selected }: { o: Opening; room: Room; style: PlanStyle; selected: boolean }) {
  const seg = wallSegment(room, o.wall, o.offset, o.width);
  const horiz = o.wall === 'S' || o.wall === 'N';
  const gap = horiz
    ? { x: seg.x1, y: seg.y1 - 0.115, width: o.width, height: 0.23 }
    : { x: seg.x1 - 0.115, y: seg.y1, width: 0.23, height: o.width };
  const sw = 0.02;
  const sel = selected ? '#0e7c86' : style.wall;
  if (o.kind === 'window') {
    const frame = horiz
      ? { x: seg.x1, y: seg.y1 - 0.1, width: o.width, height: 0.2 }
      : { x: seg.x1 - 0.1, y: seg.y1, width: 0.2, height: o.width };
    return (
      <g>
        <rect {...gap} fill={style.threshold} />
        <rect {...frame} fill={style.paper} stroke={sel} strokeWidth={selected ? 0.035 : sw} />
        {horiz ? (
          <path d={`M${seg.x1} ${seg.y1 - 0.03}H${seg.x2}M${seg.x1} ${seg.y1 + 0.03}H${seg.x2}`} stroke={sel} strokeWidth={sw * 0.8} />
        ) : (
          <path d={`M${seg.x1 - 0.03} ${seg.y1}V${seg.y2}M${seg.x1 + 0.03} ${seg.y1}V${seg.y2}`} stroke={sel} strokeWidth={sw * 0.8} />
        )}
      </g>
    );
  }
  if (o.kind === 'garage_door') {
    return (
      <g>
        <rect {...gap} fill={style.threshold} />
        {horiz ? (
          <path d={`M${seg.x1} ${seg.y1}H${seg.x2}`} stroke={sel} strokeWidth={0.03} strokeDasharray="0.12 0.08" />
        ) : (
          <path d={`M${seg.x1} ${seg.y1}V${seg.y2}`} stroke={sel} strokeWidth={0.03} strokeDasharray="0.12 0.08" />
        )}
      </g>
    );
  }
  let [nx, ny] = NORMAL[o.wall];
  if (o.swing === 'out') { nx = -nx; ny = -ny; }
  const hinge = o.hinge === 'start' ? [seg.x1, seg.y1] : [seg.x2, seg.y2];
  const other = o.hinge === 'start' ? [seg.x2, seg.y2] : [seg.x1, seg.y1];
  const tip = [hinge[0] + nx * o.width, hinge[1] + ny * o.width];
  const ax = tip[0] - hinge[0];
  const ay = tip[1] - hinge[1];
  const bx = other[0] - hinge[0];
  const by = other[1] - hinge[1];
  const sweep = ax * by - ay * bx > 0 ? 1 : 0;
  return (
    <g>
      <rect {...gap} fill={style.threshold} />
      <path d={`M${tip[0]} ${tip[1]}A${o.width} ${o.width} 0 0 ${sweep} ${other[0]} ${other[1]}`} fill="none" stroke={sel} strokeWidth={sw * 0.7} strokeDasharray="0.06 0.04" />
      <path d={`M${hinge[0]} ${hinge[1]}L${tip[0]} ${tip[1]}`} stroke={sel} strokeWidth={selected ? 0.05 : 0.035} strokeLinecap="round" />
    </g>
  );
}

function fontSizeFor(r: Room, text: string, base = 0.26) {
  const byWidth = (r.width * 0.86) / Math.max(4, text.length * 0.58);
  return Math.max(0.11, Math.min(base, byWidth, r.length / 4.2));
}

export function PlanSvg(props: Props) {
  const { project: p, style, mode, showFurniture = true, showDims = true, selection, errorIds, onPick, overlay } = props;
  const { width: W, length: L } = p.site;
  const walls = useMemo(() => computeWalls(p.rooms, p.program.preferences), [p.rooms, p.program.preferences]);
  const dims = useMemo(() => computeDimensions(p), [p]);
  const br = buildableRect(p.site);
  const vb = planViewBox(p);
  const sy = (y: number) => L - y;
  const font = props.fontFamily ?? "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
  const mono = "'IBM Plex Mono', 'SFMono-Regular', Menlo, Consolas, monospace";
  const edit = mode === 'edit';
  const roomsById = new Map(p.rooms.map((r) => [r.id, r]));
  const pick = (t: PickTarget) => (e: RPointerEvent) => {
    if (!onPick) return;
    e.stopPropagation();
    onPick(e, t);
  };

  const content = (
    <>
      <StyleDefs style={style} />
      <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill={style.paper} onPointerDown={pick({ kind: 'background' })} />

      {/* ------------ geometría en coordenadas del modelo (y hacia arriba) */}
      <g transform={`translate(0 ${L}) scale(1 -1)`} ref={props.geomRef}>
        <rect x={0} y={0} width={W} height={L} fill={`url(#${patternId(style, 'ground')})`} onPointerDown={pick({ kind: 'background' })} />
        {edit && (
          <g stroke="#0e7c86" strokeOpacity={0.12} strokeWidth={0.01} pointerEvents="none">
            {Array.from({ length: Math.floor(W) + 1 }, (_, i) => <path key={`gx${i}`} d={`M${i} 0V${L}`} />)}
            {Array.from({ length: Math.floor(L) + 1 }, (_, i) => <path key={`gy${i}`} d={`M0 ${i}H${W}`} />)}
          </g>
        )}
        <rect x={br.x} y={br.y} width={br.w} height={br.h} fill="none" stroke={edit ? '#0e7c86' : style.lotLine} strokeOpacity={edit ? 0.55 : 0.4} strokeWidth={0.025} strokeDasharray="0.2 0.12" pointerEvents="none" />

        {p.rooms.map((r) => (
          <rect
            key={r.id}
            x={r.x}
            y={r.y}
            width={r.width}
            height={r.length}
            fill={`url(#${patternId(style, FLOOR_CATEGORY[r.type])})`}
            style={{ cursor: edit ? 'move' : undefined }}
            onPointerDown={pick({ kind: 'room', id: r.id })}
          />
        ))}

        {showFurniture && (
          <g filter={style.shadow ? `url(#soft-${style.id})` : undefined}>
            {p.furniture.map((f) => {
              const r = roomsById.get(f.roomId);
              if (!r) return null;
              return (
                <g key={f.id} transform={`translate(${r.x} ${r.y})`} onPointerDown={pick({ kind: 'furniture', id: f.id })} style={{ cursor: edit ? 'grab' : undefined }}>
                  <FurnitureSymbol item={f} style={style} selected={selection?.kind === 'furniture' && selection.id === f.id} />
                </g>
              );
            })}
          </g>
        )}

        <g pointerEvents="none" filter={style.shadow ? `url(#shadow-${style.id})` : undefined}>
          {walls.filter((w) => w.kind !== 'open').map((w, i) => {
            const t = w.thick;
            return w.orient === 'h' ? (
              <rect key={i} x={w.x1 - t / 2} y={w.y1 - t / 2} width={w.x2 - w.x1 + t} height={t} fill={style.wall} />
            ) : (
              <rect key={i} x={w.x1 - t / 2} y={w.y1 - t / 2} width={t} height={w.y2 - w.y1 + t} fill={style.wall} />
            );
          })}
        </g>
        <g pointerEvents="none">
          {walls.filter((w) => w.kind === 'open').map((w, i) => (
            <path key={i} d={`M${w.x1} ${w.y1}L${w.x2} ${w.y2}`} stroke={style.openWall} strokeWidth={0.02} strokeDasharray="0.12 0.1" />
          ))}
        </g>

        {p.openings.map((o) => {
          const r = roomsById.get(o.roomId);
          if (!r) return null;
          return (
            <g key={o.id} onPointerDown={pick({ kind: 'opening', id: o.id })} style={{ cursor: edit ? 'pointer' : undefined }}>
              <OpeningShape o={o} room={r} style={style} selected={selection?.kind === 'opening' && selection.id === o.id} />
            </g>
          );
        })}

        {errorIds && p.rooms.filter((r) => errorIds.has(r.id)).map((r) => (
          <rect key={`err${r.id}`} x={r.x + 0.06} y={r.y + 0.06} width={r.width - 0.12} height={r.length - 0.12} fill="#c2410c" fillOpacity={0.12} stroke="#c2410c" strokeWidth={0.04} strokeDasharray="0.14 0.08" pointerEvents="none" />
        ))}

        {overlay}
      </g>

      {/* ------------ textos en coordenadas de pantalla */}
      <g pointerEvents="none" fontFamily={font}>
        {p.rooms.map((r) => {
          const cx = r.x + r.width / 2;
          const cy = sy(r.y + r.length / 2);
          const fs = fontSizeFor(r, r.name);
          const dimsText = `${r.width.toFixed(2)} × ${r.length.toFixed(2)}`;
          const areaText = `${(r.width * r.length).toFixed(2)} m²`;
          const small = fs * 0.78;
          const covered = CATALOG[r.type].covered;
          const halo = { stroke: style.halo, strokeWidth: fs * 0.32, paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const };
          const compact = r.length < 1.3 || r.width < 1.3;
          return (
            <g key={r.id} textAnchor="middle">
              <text x={cx} y={cy - (compact ? 0 : small * 0.9)} fontSize={fs} fontWeight={600} fill={style.text} letterSpacing={fs * 0.02} fontStyle={covered ? undefined : 'italic'} {...halo}>
                {r.name}
              </text>
              {!compact && (
                <>
                  <text x={cx} y={cy + small * 0.55} fontSize={small} fontFamily={mono} fill={style.textMuted} {...halo} strokeWidth={small * 0.32}>
                    {dimsText}
                  </text>
                  <text x={cx} y={cy + small * 1.75} fontSize={small} fontFamily={mono} fill={style.textMuted} {...halo} strokeWidth={small * 0.32}>
                    {areaText}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {showDims && p.openings.filter((o) => o.kind !== 'window' || edit).map((o) => {
          const r = roomsById.get(o.roomId);
          if (!r) return null;
          const seg = wallSegment(r, o.wall, o.offset, o.width);
          const horiz = o.wall === 'S' || o.wall === 'N';
          const [nx, ny] = NORMAL[o.wall];
          const off = o.kind === 'window' ? -0.26 : 0.26;
          const mx = (seg.x1 + seg.x2) / 2 + (horiz ? 0 : nx * off);
          const my = (seg.y1 + seg.y2) / 2 + (horiz ? ny * off : 0);
          return (
            <text key={`od${o.id}`} x={mx} y={sy(my) + 0.05} fontSize={0.13} fontFamily={mono} fill={style.textMuted} textAnchor="middle"
              transform={horiz ? undefined : `rotate(-90 ${mx} ${sy(my)})`} stroke={style.halo} strokeWidth={0.04} paintOrder="stroke">
              {o.width.toFixed(2)}
            </text>
          );
        })}

        {showDims && dims.map((d, i) => <DimLine key={i} chain={d} L={L} color={style.dim} mono={mono} />)}

        {!props.hideNorth && <NorthArrow x={W + 0.95} y={-0.85} angle={p.site.northAngle} color={style.dim} />}
        <AccessMark project={p} color={style.dim} />
      </g>
    </>
  );

  if (props.nested) {
    const n = props.nested;
    return (
      <svg x={n.x} y={n.y} width={n.width} height={n.height} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid meet">
        {content}
      </svg>
    );
  }
  return (
    <svg ref={props.svgRef} className={props.className} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} xmlns="http://www.w3.org/2000/svg" style={{ touchAction: 'none', userSelect: 'none' }}>
      {content}
    </svg>
  );
}

function DimLine({ chain, L, color, mono }: { chain: ReturnType<typeof computeDimensions>[number]; L: number; color: string; mono: string }) {
  const { ticks, at, axis, kind } = chain;
  const sw = kind === 'overall' ? 0.022 : 0.016;
  const fs = kind === 'overall' ? 0.24 : 0.17;
  const tick = 0.12;
  const els: ReactNode[] = [];
  if (axis === 'x') {
    const y = L - at;
    els.push(<path key="l" d={`M${ticks[0] - 0.15} ${y}H${ticks[ticks.length - 1] + 0.15}`} stroke={color} strokeWidth={sw} />);
    ticks.forEach((t, i) => {
      els.push(<path key={`t${i}`} d={`M${t - tick / 2} ${y + tick / 2}L${t + tick / 2} ${y - tick / 2}`} stroke={color} strokeWidth={sw * 2} />);
      els.push(<path key={`e${i}`} d={`M${t} ${L + 0.12}V${y + 0.12}`} stroke={color} strokeWidth={sw * 0.5} strokeOpacity={0.5} />);
      if (i < ticks.length - 1) {
        const len = ticks[i + 1] - t;
        if (len >= 0.3) els.push(
          <text key={`x${i}`} x={(t + ticks[i + 1]) / 2} y={y - 0.08} fontSize={Math.min(fs, len / 2.4)} fontFamily={mono} fill={color} textAnchor="middle" fontWeight={kind === 'overall' ? 600 : 400}>
            {len.toFixed(2)}
          </text>,
        );
      }
    });
  } else {
    const x = at;
    const ys = ticks.map((t) => L - t);
    els.push(<path key="l" d={`M${x} ${ys[0] + 0.15}V${ys[ys.length - 1] - 0.15}`} stroke={color} strokeWidth={sw} />);
    ys.forEach((y, i) => {
      els.push(<path key={`t${i}`} d={`M${x - tick / 2} ${y + tick / 2}L${x + tick / 2} ${y - tick / 2}`} stroke={color} strokeWidth={sw * 2} />);
      els.push(<path key={`e${i}`} d={`M${-0.12} ${y}H${x - 0.12}`} stroke={color} strokeWidth={sw * 0.5} strokeOpacity={0.5} />);
      if (i < ys.length - 1) {
        const len = ticks[i + 1] - ticks[i];
        const my = (y + ys[i + 1]) / 2;
        if (len >= 0.3) els.push(
          <text key={`y${i}`} x={x - 0.08} y={my} fontSize={Math.min(fs, len / 2.4)} fontFamily={mono} fill={color} textAnchor="middle" transform={`rotate(-90 ${x - 0.08} ${my})`} fontWeight={kind === 'overall' ? 600 : 400}>
            {len.toFixed(2)}
          </text>,
        );
      }
    });
  }
  return <g>{els}</g>;
}

export function NorthArrow({ x, y, angle, color, r = 0.5 }: { x: number; y: number; angle: number; color: string; r?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill="none" stroke={color} strokeWidth={r * 0.04} />
      <g transform={`rotate(${angle})`}>
        <path d={`M0 ${-r * 0.85}L${r * 0.32} ${r * 0.55}L0 ${r * 0.3}Z`} fill={color} />
        <path d={`M0 ${-r * 0.85}L${-r * 0.32} ${r * 0.55}L0 ${r * 0.3}Z`} fill="none" stroke={color} strokeWidth={r * 0.04} />
        <text y={-r * 1.12} fontSize={r * 0.5} fontWeight={700} textAnchor="middle" fill={color}>N</text>
      </g>
    </g>
  );
}

function AccessMark({ project: p, color }: { project: Project; color: string }) {
  const { width: W, length: L, access } = p.site;
  const label = 'ACCESO · VÍA PÚBLICA';
  const fs = 0.2;
  const pos = {
    front: { x: W / 2, y: L + 2.65, rot: 0 },
    back: { x: W / 2, y: -1.25, rot: 0 },
    left: { x: -2.6, y: L / 2, rot: -90 },
    right: { x: W + 1.35, y: L / 2, rot: 90 },
  }[access];
  return (
    <text x={pos.x} y={pos.y} fontSize={fs} letterSpacing={0.06} fill={color} textAnchor="middle" fontWeight={600} opacity={0.75}
      transform={pos.rot ? `rotate(${pos.rot} ${pos.x} ${pos.y})` : undefined}>
      {access === 'front' ? '▲ ' : access === 'back' ? '▼ ' : ''}{label}
    </text>
  );
}
