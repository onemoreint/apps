import type { Ref } from 'react';
import type { Project } from '../geometry/types';
import { computeAreas } from '../layout-engine/validate';
import { PlanSvg, planViewBox, NorthArrow } from './PlanSvg';
import type { PlanStyle } from './styles';

export const SHEET = { w: 420, h: 297 };
const BRAND = '#0e7c86';
const INK = '#16212b';
const SANS = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
const MONO = "'IBM Plex Mono', Menlo, Consolas, monospace";
const COND = "'IBM Plex Sans Condensed', 'Arial Narrow', Arial, sans-serif";

/** Lámina de presentación A3 horizontal (unidades en mm) */
export function Sheet({ project: p, style, svgRef, showFurniture = true }: { project: Project; style: PlanStyle; svgRef?: Ref<SVGSVGElement>; showFurniture?: boolean }) {
  const a = computeAreas(p);
  const plan = { x: 12, y: 12, w: 282, h: 273 };
  const vb = planViewBox(p);
  const scale = Math.min(plan.w / vb.w, plan.h / vb.h); // mm por metro
  const ratio = Math.round(1000 / scale / 5) * 5;
  const px = 304;
  const pw = 104;
  const rows = [...a.rooms].sort((x, y) => y.area - x.area).slice(0, 18);
  const date = new Date(p.updatedAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  const kv: [string, string][] = [
    ['Terreno', `${p.site.width.toFixed(2)} × ${p.site.length.toFixed(2)} m`],
    ['Área del terreno', `${a.lot.toFixed(2)} m²`],
    ['Área construida', `${a.built.toFixed(2)} m²`],
    ['Área libre', `${a.free.toFixed(2)} m²`],
    ['Circulación', `${a.circulation.toFixed(2)} m²`],
    ['Ocupación', `${a.occupancy.toFixed(1)} %`],
  ];
  const barM = scale * 5 > 60 ? 2 : 5;
  const barLen = barM * scale;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${SHEET.w} ${SHEET.h}`} xmlns="http://www.w3.org/2000/svg" className="sheet-svg" fontFamily={SANS}>
      <rect width={SHEET.w} height={SHEET.h} fill="#ffffff" />
      <rect x={6} y={6} width={SHEET.w - 12} height={SHEET.h - 12} fill="none" stroke={INK} strokeWidth={0.5} />
      <PlanSvg project={p} style={style} mode="print" hideNorth showFurniture={showFurniture} nested={{ x: plan.x, y: plan.y, width: plan.w, height: plan.h }} />
      <path d={`M${px - 6} 6V${SHEET.h - 6}`} stroke={INK} strokeWidth={0.35} />

      {/* marca */}
      <g transform={`translate(${px} 16)`}>
        <rect width={9} height={9} fill={BRAND} />
        <path d="M2 7L4.5 2L7 7M3 5.4H6" stroke="#fff" strokeWidth={0.8} fill="none" />
        <text x={12} y={5.2} fontSize={5.2} fontWeight={700} fill={INK} letterSpacing={0.4} fontFamily={COND}>ARQUIGEN 360</text>
        <text x={12} y={9} fontSize={2.5} fill="#5b6570" letterSpacing={0.2}>GENERADOR INTELIGENTE DE PLANOS</text>
      </g>

      <g transform={`translate(${px} 40)`}>
        <text fontSize={2.6} fill={BRAND} letterSpacing={0.5} fontWeight={600}>PROYECTO</text>
        <text y={8} fontSize={7} fontWeight={700} fill={INK} fontFamily={COND}>{p.name.slice(0, 26)}</text>
        <text y={14} fontSize={3} fill="#5b6570">Vivienda unifamiliar · {p.site.floors} {p.site.floors === 1 ? 'piso' : 'pisos'} · Planta arquitectónica</text>
      </g>

      <g transform={`translate(${px} 64)`}>
        {kv.map(([k, v], i) => (
          <g key={k} transform={`translate(0 ${i * 7})`}>
            <text fontSize={2.9} fill="#5b6570">{k}</text>
            <text x={pw} fontSize={3.2} fontFamily={MONO} fill={INK} textAnchor="end" fontWeight={k === 'Área construida' ? 700 : 400}>{v}</text>
            <path d={`M0 2.2H${pw}`} stroke="#d5dadf" strokeWidth={0.25} />
          </g>
        ))}
      </g>

      <g transform={`translate(${px} 112)`}>
        <text fontSize={2.6} fill={BRAND} letterSpacing={0.5} fontWeight={600}>CUADRO DE ÁREAS</text>
        <g transform="translate(0 6)" fontSize={2.6}>
          <text fill="#5b6570">Ambiente</text>
          <text x={68} fill="#5b6570" textAnchor="end">Medidas (m)</text>
          <text x={pw} fill="#5b6570" textAnchor="end">m²</text>
          {rows.map((r, i) => (
            <g key={r.id} transform={`translate(0 ${6 + i * 5.1})`}>
              <text fill={INK}>{r.name.length > 26 ? `${r.name.slice(0, 25)}…` : r.name}</text>
              <text x={68} fill={INK} fontFamily={MONO} textAnchor="end">{r.width.toFixed(2)} × {r.length.toFixed(2)}</text>
              <text x={pw} fill={INK} fontFamily={MONO} textAnchor="end">{r.area.toFixed(2)}</text>
            </g>
          ))}
        </g>
      </g>

      {/* norte, escala y rótulo */}
      <g transform={`translate(${px} ${SHEET.h - 42})`}>
        <g transform="translate(10 8)" fontFamily={SANS}>
          <NorthArrow x={0} y={0} angle={p.site.northAngle} color={INK} r={7} />
        </g>
        <g transform="translate(30 6)">
          <text fontSize={2.4} fill="#5b6570" letterSpacing={0.3}>ESCALA GRÁFICA</text>
          <g transform="translate(0 4)">
            {Array.from({ length: barM }, (_, i) => (
              <rect key={i} x={(i * barLen) / barM} y={0} width={barLen / barM} height={1.6} fill={i % 2 ? '#fff' : INK} stroke={INK} strokeWidth={0.25} />
            ))}
            <text y={5} fontSize={2.3} fontFamily={MONO} fill={INK}>0</text>
            <text x={barLen} y={5} fontSize={2.3} fontFamily={MONO} fill={INK} textAnchor="middle">{barM} m</text>
          </g>
          <text y={16} fontSize={2.4} fill="#5b6570">Escala aprox. 1:{ratio} en A3 · medidas a eje de muro</text>
        </g>
      </g>
      <g transform={`translate(${px} ${SHEET.h - 14})`}>
        <path d={`M0 -4H${pw}`} stroke={INK} strokeWidth={0.3} />
        <text fontSize={2.5} fill="#5b6570">{style.label}</text>
        <text x={pw} fontSize={2.5} fill="#5b6570" textAnchor="end">{date}</text>
        <text y={4} fontSize={2.2} fill="#8a939c">Propuesta preliminar generada con ARQUIGEN 360. No apta para construcción.</text>
      </g>
    </svg>
  );
}
