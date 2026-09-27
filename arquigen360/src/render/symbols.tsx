import type { ReactNode } from 'react';
import type { FurnitureItem } from '../geometry/types';
import { FURNITURE } from '../furniture/library';
import type { FloorDef, Pattern, PlanStyle } from './styles';

export const patternId = (style: PlanStyle, key: string) => `pat-${style.id}-${key}`;

function PatternDef({ id, def }: { id: string; def: FloorDef }) {
  const { fill, line, pattern } = def;
  const sw = 0.012;
  switch (pattern as Pattern) {
    case 'wood':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width={1.8} height={0.28}>
          <rect width={1.8} height={0.28} fill={fill} />
          <path d={`M0 0.14H1.8M0 0.28H1.8M0.6 0V0.14M1.5 0.14V0.28`} stroke={line} strokeWidth={sw} />
        </pattern>
      );
    case 'tile':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width={0.3} height={0.3}>
          <rect width={0.3} height={0.3} fill={fill} />
          <path d="M0 0H0.3M0 0V0.3" stroke={line} strokeWidth={sw} />
        </pattern>
      );
    case 'bigtile':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width={0.6} height={0.6}>
          <rect width={0.6} height={0.6} fill={fill} />
          <path d="M0 0H0.6M0 0V0.6" stroke={line} strokeWidth={sw} />
        </pattern>
      );
    case 'concrete':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width={1.2} height={1.2}>
          <rect width={1.2} height={1.2} fill={fill} />
          <g fill={line}>
            <circle cx={0.2} cy={0.3} r={0.018} /><circle cx={0.75} cy={0.15} r={0.012} /><circle cx={0.95} cy={0.8} r={0.02} />
            <circle cx={0.4} cy={0.95} r={0.012} /><circle cx={0.55} cy={0.55} r={0.015} />
          </g>
          <path d="M0 0H1.2M0 0V1.2" stroke={line} strokeWidth={sw * 0.8} />
        </pattern>
      );
    case 'grass':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width={0.8} height={0.8}>
          <rect width={0.8} height={0.8} fill={fill} />
          <g stroke={line} strokeWidth={0.02} strokeLinecap="round">
            <path d="M0.1 0.2l0.03 0.08M0.16 0.2l-0.02 0.09M0.5 0.55l0.03 0.08M0.56 0.55l-0.02 0.09M0.62 0.12l0.02 0.07M0.3 0.7l0.03 0.07" />
          </g>
        </pattern>
      );
    case 'deck':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width={0.15} height={2}>
          <rect width={0.15} height={2} fill={fill} />
          <path d="M0 0V2" stroke={line} strokeWidth={sw * 1.4} />
        </pattern>
      );
    default:
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width={1} height={1}>
          <rect width={1} height={1} fill={fill} />
        </pattern>
      );
  }
}

export function StyleDefs({ style }: { style: PlanStyle }) {
  return (
    <defs>
      {Object.entries(style.floors).map(([k, def]) => (
        <PatternDef key={k} id={patternId(style, k)} def={def} />
      ))}
      <PatternDef id={patternId(style, 'ground')} def={{ fill: style.ground, line: style.groundLine, pattern: style.groundPattern }} />
      <filter id={`shadow-${style.id}`} x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx={0.08} dy={-0.1} stdDeviation={0.07} floodColor="#000" floodOpacity={0.28} />
      </filter>
      <filter id={`soft-${style.id}`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx={0.05} dy={-0.06} stdDeviation={0.05} floodColor="#000" floodOpacity={0.18} />
      </filter>
    </defs>
  );
}

/** Símbolo de mueble en coordenadas locales: centro (0,0), respaldo hacia +y */
export function FurnitureSymbol({ item, style, selected }: { item: FurnitureItem; style: PlanStyle; selected?: boolean }) {
  const def = FURNITURE[item.kind];
  const w = item.w ?? def.w;
  const d = def.d;
  const hw = w / 2;
  const hd = d / 2;
  const s = style.furnStroke;
  const f = style.furnFill;
  const sw = 0.018;
  const common = { stroke: s, strokeWidth: sw, fill: f };
  let body: ReactNode = null;

  switch (item.kind) {
    case 'bed_single':
    case 'bed_double':
    case 'bed_queen':
    case 'bed_king': {
      const pillows = item.kind === 'bed_single' ? 1 : 2;
      const pw = (w - 0.2 - (pillows - 1) * 0.08) / pillows;
      body = (
        <>
          <rect x={-hw} y={-hd} width={w} height={d} rx={0.04} {...common} />
          <rect x={-hw + 0.03} y={-hd + 0.03} width={w - 0.06} height={d * 0.68} rx={0.04} fill={style.furnAccent} stroke={s} strokeWidth={sw * 0.7} />
          <path d={`M${-hw + 0.03} ${-hd + d * 0.56}H${hw - 0.03}`} stroke={s} strokeWidth={sw * 0.7} />
          {Array.from({ length: pillows }, (_, i) => (
            <rect key={i} x={-hw + 0.1 + i * (pw + 0.08)} y={hd - 0.42} width={pw} height={0.32} rx={0.07} fill={f} stroke={s} strokeWidth={sw * 0.8} />
          ))}
        </>
      );
      break;
    }
    case 'nightstand':
      body = (
        <>
          <rect x={-hw} y={-hd} width={w} height={d} {...common} />
          <circle r={0.1} fill={style.furnSoft} stroke={s} strokeWidth={sw * 0.7} />
        </>
      );
      break;
    case 'wardrobe':
    case 'upper_cabinets': {
      const n = Math.max(1, Math.round(w / 0.6));
      body = (
        <>
          <rect x={-hw} y={-hd} width={w} height={d} {...common} strokeDasharray={item.kind === 'upper_cabinets' ? '0.08 0.05' : undefined} fill={item.kind === 'upper_cabinets' ? 'none' : f} />
          {item.kind === 'wardrobe' && (
            <>
              <path d={`M${-hw} ${hd - 0.08}H${hw}`} stroke={s} strokeWidth={sw * 0.7} />
              {Array.from({ length: n - 1 }, (_, i) => (
                <path key={i} d={`M${-hw + ((i + 1) * w) / n} ${-hd}V${hd - 0.08}`} stroke={s} strokeWidth={sw * 0.6} />
              ))}
              <path d={`M${-hw + 0.1} ${hd - 0.08}L${hw - 0.1} ${-hd + 0.06}`} stroke={s} strokeWidth={sw * 0.4} strokeDasharray="0.05 0.05" />
            </>
          )}
        </>
      );
      break;
    }
    case 'desk':
      body = (
        <>
          <rect x={-hw} y={-hd} width={w} height={d} {...common} />
          <rect x={-0.22} y={-hd - 0.42} width={0.44} height={0.42} rx={0.1} fill={style.furnSoft} stroke={s} strokeWidth={sw * 0.8} />
        </>
      );
      break;
    case 'sofa2':
    case 'sofa3': {
      const seats = item.kind === 'sofa2' ? 2 : 3;
      const iw = w - 0.3;
      body = (
        <>
          <rect x={-hw} y={-hd} width={w} height={d} rx={0.08} fill={style.furnAccent} stroke={s} strokeWidth={sw} />
          <rect x={-hw + 0.15} y={-hd + 0.02} width={iw} height={d - 0.24} rx={0.04} fill={f} stroke={s} strokeWidth={sw * 0.7} />
          {Array.from({ length: seats - 1 }, (_, i) => (
            <path key={i} d={`M${-hw + 0.15 + ((i + 1) * iw) / seats} ${-hd + 0.02}V${hd - 0.22}`} stroke={s} strokeWidth={sw * 0.7} />
          ))}
        </>
      );
      break;
    }
    case 'sofaL':
      body = (
        <>
          <path d={`M${-hw} ${hd}H${hw}V${-hd}H${hw - 0.9}V${hd - 0.9}H${-hw}Z`} fill={style.furnAccent} stroke={s} strokeWidth={sw} />
          <path d={`M${-hw + 0.02} ${hd - 0.22}H${hw - 0.22}V${-hd + 0.02}`} fill="none" stroke={s} strokeWidth={sw * 0.7} />
        </>
      );
      break;
    case 'coffee_table':
      body = <rect x={-hw} y={-hd} width={w} height={d} rx={0.12} fill={style.furnSoft} stroke={s} strokeWidth={sw} />;
      break;
    case 'tv_unit':
      body = (
        <>
          <rect x={-hw} y={-hd} width={w} height={d} {...common} />
          <rect x={-hw * 0.8} y={hd - 0.1} width={w * 0.8} height={0.05} fill={s} />
        </>
      );
      break;
    case 'table4':
    case 'table6':
    case 'table8': {
      const per = item.kind === 'table4' ? 2 : item.kind === 'table6' ? 3 : 4;
      const tw = w - 0.6;
      const td = d - 0.5;
      const chairs: ReactNode[] = [];
      for (let i = 0; i < per; i++) {
        const cy = -td / 2 + ((i + 0.5) * td) / per;
        chairs.push(<rect key={`l${i}`} x={-tw / 2 - 0.38} y={cy - 0.2} width={0.36} height={0.4} rx={0.08} fill={style.furnSoft} stroke={s} strokeWidth={sw * 0.8} />);
        chairs.push(<rect key={`r${i}`} x={tw / 2 + 0.02} y={cy - 0.2} width={0.36} height={0.4} rx={0.08} fill={style.furnSoft} stroke={s} strokeWidth={sw * 0.8} />);
      }
      body = (
        <>
          {chairs}
          <rect x={-tw / 2} y={-td / 2} width={tw} height={td} rx={0.03} {...common} />
        </>
      );
      break;
    }
    case 'fridge':
      body = (
        <>
          <rect x={-hw} y={-hd} width={w} height={d} {...common} />
          <path d={`M${-hw} ${-hd + 0.08}H${hw}M${-hw + 0.08} ${-hd}L${hw - 0.08} ${hd}`} stroke={s} strokeWidth={sw * 0.6} />
        </>
      );
      break;
    case 'counter': {
      body = (
        <>
          <rect x={-hw} y={-hd} width={w} height={d} fill={style.furnSoft} stroke={s} strokeWidth={sw} />
          {w >= 1.4 && (
            <>
              <rect x={-hw + 0.25} y={-hd + 0.1} width={0.55} height={0.4} rx={0.06} fill={style.glass} stroke={s} strokeWidth={sw * 0.7} />
              <circle cx={-hw + 0.525} cy={hd - 0.12} r={0.025} fill={s} />
            </>
          )}
          {w >= 2.0 && (
            <g fill="none" stroke={s} strokeWidth={sw * 0.7}>
              <circle cx={hw - 0.42} cy={-0.12} r={0.08} /><circle cx={hw - 0.18} cy={-0.12} r={0.07} />
              <circle cx={hw - 0.42} cy={0.13} r={0.07} /><circle cx={hw - 0.18} cy={0.13} r={0.08} />
            </g>
          )}
        </>
      );
      break;
    }
    case 'sink':
      body = (
        <>
          <rect x={-hw} y={-hd} width={w} height={d} fill={style.furnSoft} stroke={s} strokeWidth={sw} />
          <rect x={-hw + 0.1} y={-hd + 0.08} width={w - 0.2} height={d - 0.2} rx={0.06} fill={style.glass} stroke={s} strokeWidth={sw * 0.7} />
        </>
      );
      break;
    case 'stove':
      body = (
        <>
          <rect x={-hw} y={-hd} width={w} height={d} fill={style.furnSoft} stroke={s} strokeWidth={sw} />
          <g fill="none" stroke={s} strokeWidth={sw * 0.7}>
            <circle cx={-0.14} cy={-0.14} r={0.08} /><circle cx={0.14} cy={-0.14} r={0.08} /><circle cx={-0.14} cy={0.14} r={0.08} /><circle cx={0.14} cy={0.14} r={0.08} />
          </g>
        </>
      );
      break;
    case 'island':
      body = <rect x={-hw} y={-hd} width={w} height={d} rx={0.03} fill={style.furnSoft} stroke={s} strokeWidth={sw} />;
      break;
    case 'shower':
      body = (
        <>
          <rect x={-hw} y={-hd} width={w} height={d} fill={style.glass} stroke={s} strokeWidth={sw} />
          <path d={`M${-hw} ${-hd}L${hw} ${hd}M${-hw} ${hd}L${hw} ${-hd}`} stroke={s} strokeWidth={sw * 0.5} />
          <circle r={0.04} fill={f} stroke={s} strokeWidth={sw * 0.6} />
        </>
      );
      break;
    case 'bathtub':
      body = (
        <>
          <rect x={-hw} y={-hd} width={w} height={d} rx={0.05} {...common} />
          <rect x={-hw + 0.08} y={-hd + 0.08} width={w - 0.16} height={d - 0.16} rx={0.25} fill={style.glass} stroke={s} strokeWidth={sw * 0.7} />
        </>
      );
      break;
    case 'wc':
      body = (
        <>
          <rect x={-hw} y={hd - 0.2} width={w} height={0.2} rx={0.03} {...common} />
          <ellipse cx={0} cy={-0.05} rx={hw - 0.02} ry={0.26} {...common} />
        </>
      );
      break;
    case 'basin':
      body = (
        <>
          <rect x={-hw} y={-hd} width={w} height={d} rx={0.04} {...common} />
          <ellipse cx={0} cy={-0.03} rx={hw - 0.1} ry={hd - 0.1} fill={style.glass} stroke={s} strokeWidth={sw * 0.7} />
        </>
      );
      break;
    case 'washer':
      body = (
        <>
          <rect x={-hw} y={-hd} width={w} height={d} rx={0.03} {...common} />
          <circle r={0.2} fill={style.glass} stroke={s} strokeWidth={sw * 0.7} />
        </>
      );
      break;
    case 'car':
      body = (
        <>
          <rect x={-hw} y={-hd} width={w} height={d} rx={0.35} fill={style.car} stroke={s} strokeWidth={sw} />
          <path d={`M${-hw + 0.18} ${-hd + 1.1}Q0 ${-hd + 0.85} ${hw - 0.18} ${-hd + 1.1}L${hw - 0.25} ${-hd + 1.55}H${-hw + 0.25}Z`} fill={style.glass} stroke={s} strokeWidth={sw * 0.7} />
          <path d={`M${-hw + 0.25} ${hd - 1.05}H${hw - 0.25}L${hw - 0.18} ${hd - 0.65}Q0 ${hd - 0.5} ${-hw + 0.18} ${hd - 0.65}Z`} fill={style.glass} stroke={s} strokeWidth={sw * 0.7} />
        </>
      );
      break;
    case 'plant':
      body = (
        <>
          <circle r={hw} fill={style.tree} stroke={style.treeDark} strokeWidth={sw} />
          <path d={`M0 ${-hw}V${hw}M${-hw} 0H${hw}M${-hw * 0.7} ${-hw * 0.7}L${hw * 0.7} ${hw * 0.7}M${-hw * 0.7} ${hw * 0.7}L${hw * 0.7} ${-hw * 0.7}`} stroke={style.treeDark} strokeWidth={sw * 0.7} />
        </>
      );
      break;
    case 'tree': {
      const n = 11;
      const pts = Array.from({ length: n * 2 }, (_, i) => {
        const a = (i / (n * 2)) * Math.PI * 2;
        const r = i % 2 ? hw * 0.82 : hw;
        return `${(Math.cos(a) * r).toFixed(3)},${(Math.sin(a) * r).toFixed(3)}`;
      });
      body = (
        <>
          <polygon points={pts.join(' ')} fill={style.tree} stroke={style.treeDark} strokeWidth={sw} opacity={0.92} />
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return <path key={i} d={`M0 0L${Math.cos(a) * hw * 0.6} ${Math.sin(a) * hw * 0.6}`} stroke={style.treeDark} strokeWidth={sw * 0.8} />;
          })}
          <circle r={0.09} fill={style.treeDark} />
        </>
      );
      break;
    }
    case 'stairs': {
      const steps = Math.floor(d / 0.28);
      body = (
        <>
          <rect x={-hw} y={-hd} width={w} height={d} {...common} />
          {Array.from({ length: steps - 1 }, (_, i) => (
            <path key={i} d={`M${-hw} ${-hd + (i + 1) * 0.28}H${hw}`} stroke={s} strokeWidth={sw * 0.6} />
          ))}
          <path d={`M0 ${-hd + 0.15}V${hd - 0.3}M-0.1 ${hd - 0.45}L0 ${hd - 0.3}L0.1 ${hd - 0.45}`} stroke={s} strokeWidth={sw} fill="none" />
        </>
      );
      break;
    }
  }
  return (
    <g transform={`translate(${item.cx} ${item.cy}) rotate(${item.rotation})`}>
      {body}
      {selected && <rect x={-hw - 0.05} y={-hd - 0.05} width={w + 0.1} height={d + 0.1} fill="none" stroke="#0e7c86" strokeWidth={0.035} strokeDasharray="0.1 0.06" />}
    </g>
  );
}
