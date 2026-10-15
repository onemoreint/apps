import { corto } from '../lib/format';

export const PALETA = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)'];

export interface Segmento {
  etiqueta: string;
  valor: number;
  color: string;
}

/** Barra apilada horizontal + leyenda (Tus ingresos / Detalle de tus finanzas). */
export function BarraApilada({ segmentos, fmt, alto = 34 }: { segmentos: Segmento[]; fmt: (n: number) => string; alto?: number }) {
  const total = segmentos.reduce((a, s) => a + Math.max(0, s.valor), 0);
  return (
    <div className="apilada">
      <div className="apilada-barra" style={{ height: alto }} role="img" aria-label={segmentos.map((s) => `${s.etiqueta} ${fmt(s.valor)}`).join(', ')}>
        {total === 0 ? (
          <div className="apilada-vacia">Sin datos este mes</div>
        ) : (
          segmentos
            .filter((s) => s.valor > 0)
            .map((s) => (
              <div key={s.etiqueta} className="apilada-seg" style={{ flexGrow: s.valor, background: s.color }} title={`${s.etiqueta}: ${fmt(s.valor)}`} />
            ))
        )}
      </div>
      <ul className="leyenda">
        {segmentos.map((s) => (
          <li key={s.etiqueta}>
            <span className="punto" style={{ background: s.color }} />
            <span className="leyenda-nombre">{s.etiqueta}</span>
            <span className="num">{fmt(s.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Anillo de avance de la meta de ahorro. */
export function Anillo({ avance, size = 120 }: { avance: number; size?: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, avance));
  return (
    <svg viewBox="0 0 110 110" width={size} height={size} role="img" aria-label={`${Math.round(avance * 100)}% de la meta`}>
      <circle cx="55" cy="55" r={r} fill="none" stroke="var(--line)" strokeWidth="11" />
      <circle
        cx="55" cy="55" r={r} fill="none" stroke="var(--ahorro)" strokeWidth="11" strokeLinecap="round"
        strokeDasharray={`${c * v} ${c}`} transform="rotate(-90 55 55)"
        style={{ transition: 'stroke-dasharray .5s ease' }}
      />
      <text x="55" y="61" textAnchor="middle" className="anillo-txt" fill="var(--ink)">
        {Math.round(avance * 100)}%
      </text>
    </svg>
  );
}

/** Columnas agrupadas: presupuesto vs real por grupo. */
export function ColumnasAgrupadas({
  datos, fmt,
}: { datos: { etiqueta: string; a: number; b: number }[]; fmt: (n: number) => string }) {
  const W = 320, H = 190, padL = 44, padB = 28, padT = 10;
  const max = Math.max(1, ...datos.flatMap((d) => [d.a, d.b]));
  const ticks = escala(max);
  const top = ticks[ticks.length - 1];
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  const banda = (W - padL - 8) / datos.length;
  const bw = Math.min(26, banda / 3);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="grafico" role="img" aria-label="Gastos presupuesto contra real por grupo">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - 4} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth="1" />
          <text x={padL - 6} y={y(t) + 3.5} textAnchor="end" className="eje" fill="var(--muted)">{corto(t)}</text>
        </g>
      ))}
      {datos.map((d, i) => {
        const cx = padL + banda * i + banda / 2;
        return (
          <g key={d.etiqueta}>
            <rect x={cx - bw - 2} y={y(d.a)} width={bw} height={Math.max(0, y(0) - y(d.a))} fill="var(--pres)" rx="2"><title>{`Presupuesto ${d.etiqueta}: ${fmt(d.a)}`}</title></rect>
            <rect x={cx + 2} y={y(d.b)} width={bw} height={Math.max(0, y(0) - y(d.b))} fill={d.b > d.a && d.a > 0 ? 'var(--gasto)' : 'var(--real)'} rx="2"><title>{`Real ${d.etiqueta}: ${fmt(d.b)}`}</title></rect>
            <text x={cx} y={H - 10} textAnchor="middle" className="eje" fill="var(--ink-2)">{d.etiqueta}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Columnas por día (Seguimiento de gastos x día). */
export function ColumnasDia({ datos, fmt, etiqueta }: { datos: { x: string; v: number }[]; fmt: (n: number) => string; etiqueta: (x: string) => string }) {
  if (!datos.length) return <p className="vacio">No hay movimientos con estos filtros.</p>;
  const bw = 26, gap = 10, padL = 44, padB = 30, padT = 18, H = 200;
  const W = Math.max(300, padL + datos.length * (bw + gap) + 8);
  const max = Math.max(1, ...datos.map((d) => d.v));
  const ticks = escala(max);
  const top = ticks[ticks.length - 1];
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  const iMax = datos.findIndex((d) => d.v === max);
  return (
    <div className="scroll-x">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="grafico" role="img" aria-label="Importe por día">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - 4} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
            <text x={padL - 6} y={y(t) + 3.5} textAnchor="end" className="eje" fill="var(--muted)">{corto(t)}</text>
          </g>
        ))}
        {datos.map((d, i) => {
          const x = padL + 6 + i * (bw + gap);
          return (
            <g key={d.x}>
              <rect x={x} y={y(d.v)} width={bw} height={Math.max(0, y(0) - y(d.v))} rx="2" fill={i === iMax ? 'var(--gasto)' : 'var(--real)'}>
                <title>{`${etiqueta(d.x)}: ${fmt(d.v)}`}</title>
              </rect>
              {i === iMax && (
                <text x={x + bw / 2} y={y(d.v) - 5} textAnchor="middle" className="eje fuerte" fill="var(--ink)">{corto(d.v)}</text>
              )}
              <text x={x + bw / 2} y={H - 12} textAnchor="middle" className="eje" fill="var(--ink-2)">{etiqueta(d.x)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Barras horizontales agrupadas (Detalle de gastos por Grupo / Categoría). */
export function BarrasCategoria({
  filas, fmt, presupuesto,
}: { filas: { grupo: string; categoria: string; total: number }[]; fmt: (n: number) => string; presupuesto?: (g: string, c: string) => number }) {
  const max = Math.max(1, ...filas.map((f) => Math.max(f.total, presupuesto?.(f.grupo, f.categoria) ?? 0)));
  const grupos = [...new Set(filas.map((f) => f.grupo))];
  return (
    <div className="hbars">
      {grupos.map((g) => (
        <div key={g} className="hbars-grupo">
          <div className="hbars-titulo">{g}</div>
          {filas.filter((f) => f.grupo === g).map((f) => {
            const p = presupuesto?.(f.grupo, f.categoria) ?? 0;
            const pasado = p > 0 && f.total > p;
            return (
              <div key={f.categoria} className="hbar">
                <span className="hbar-nombre">{f.categoria}</span>
                <span className="hbar-pista">
                  <span className="hbar-relleno" style={{ width: `${(f.total / max) * 100}%`, background: pasado ? 'var(--gasto)' : 'var(--real)' }} />
                  {p > 0 && <span className="hbar-marca" style={{ left: `${(p / max) * 100}%` }} title={`Presupuesto ${fmt(p)}`} />}
                </span>
                <span className={`num hbar-valor${f.total === 0 ? ' cero' : ''}`}>{f.total === 0 ? '$-' : fmt(f.total)}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Ticks "bonitos" para un eje que empieza en 0. */
export function escala(max: number, n = 4): number[] {
  const crudo = max / n;
  const pot = Math.pow(10, Math.floor(Math.log10(crudo)));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= crudo) ?? crudo;
  const out: number[] = [];
  for (let v = 0; v <= max + paso * 0.999; v += paso) out.push(Math.round(v));
  if (out.length < 2) out.push(paso);
  return out;
}
