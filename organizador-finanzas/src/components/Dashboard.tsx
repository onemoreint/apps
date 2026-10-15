import { useMemo, useState } from 'react';
import {
  GRUPOS, alertas, claveCat, porCategoria, porDia, presupuestoGrupo, realPorGrupo, resumen, top5NoEsencial,
  type Estado, type MesConfig, type Movimiento, type Tipo,
} from '../lib/finance';
import { diaMes, nombreMes } from '../lib/format';
import { Anillo, BarraApilada, BarrasCategoria, ColumnasAgrupadas, ColumnasDia, PALETA } from './charts';

interface Props {
  estado: Estado;
  mes: string;
  movsMes: Movimiento[];
  cfg: MesConfig;
  fmt: (n: number) => string;
  irA: (tab: 'movimientos' | 'presupuesto') => void;
}

export function Dashboard({ estado, mes, movsMes, cfg, fmt, irA }: Props) {
  const r = resumen(movsMes, cfg);
  const top5 = top5NoEsencial(movsMes, estado.catalogo, estado.ajustes.top5ModoExcel);
  const al = alertas(movsMes, cfg, estado.catalogo);

  const [tipoDet, setTipoDet] = useState<Tipo>('Gasto');
  const [grupoDet, setGrupoDet] = useState('');
  const [tipoDia, setTipoDia] = useState<Tipo | ''>('Gasto');
  const [grupoDia, setGrupoDia] = useState('');

  const ingresosCat = porCategoria(movsMes, estado.catalogo, 'Ingreso');
  const detalle = useMemo(
    () => porCategoria(movsMes, estado.catalogo, tipoDet, grupoDet || undefined),
    [movsMes, estado.catalogo, tipoDet, grupoDet],
  );
  const dias = porDia(movsMes, { tipo: tipoDia, grupo: grupoDia });
  const real = realPorGrupo(movsMes);
  const vacio = movsMes.length === 0;

  return (
    <div className="dash">
      <section className="kpis" aria-label="Resumen del mes">
        <Kpi titulo="Puedes gastar" valor={fmt(r.puedesGastar)} nota={r.presupuestoGastos ? 'Según tu presupuesto' : 'Arma tu presupuesto para calcularlo'} estado={r.puedesGastar < 0 ? 'mal' : undefined} icono="calc" accion={!r.presupuestoGastos ? () => irA('presupuesto') : undefined} />
        <Kpi titulo="Gasto total" valor={fmt(r.gastos)} nota={`${movsMes.filter((m) => m.tipo === 'Gasto').length} gastos registrados`} icono="recibo" />
        <Kpi titulo="Vas ahorrando" valor={fmt(r.ahorro)} nota={r.metaAhorro ? `Meta: ${fmt(r.metaAhorro)}` : 'Sin meta definida'} icono="alcancia" />
        <Kpi titulo="En total" valor={fmt(r.enTotal)} nota="El acumulado de tus finanzas" icono="billetera" />
      </section>

      {vacio && (
        <div className="aviso-vacio">
          <strong>Aún no hay movimientos en {nombreMes(mes)}.</strong>
          <span>Registra tu primer ingreso, gasto o ahorro y el tablero se llena solo.</span>
          <button className="btn primario" onClick={() => irA('movimientos')}>Registrar movimiento</button>
        </div>
      )}

      {al.length > 0 && (
        <section className="alertas" aria-label="Alertas">
          {al.map((a, i) => (
            <div key={i} className={`chip ${a.nivel}`}>
              <span className="chip-dot" />
              {a.texto}
            </div>
          ))}
        </section>
      )}

      <div className="rejilla">
        <article className="tarjeta top5">
          <header className="mes-cabecera">
            <span className="mes-calendario" aria-hidden="true"><i /><i /></span>
            <h2>{nombreMes(mes, false).toUpperCase()}</h2>
          </header>
          <h3 className="sub">5 gastos <em>NoEsencial</em></h3>
          <ol className="top5-lista">
            {top5.map((t, i) => (
              <li key={i}>
                <span className="top5-nombre">{t.categoria}</span>
                <span className="top5-monto">Monto: <b className="num">{fmt(t.total)}</b></span>
              </li>
            ))}
          </ol>
        </article>

        <article className="tarjeta">
          <h3>Tus ingresos: <span className="num">{fmt(r.ingresos)}</span></h3>
          <BarraApilada fmt={fmt} segmentos={ingresosCat.filter((c) => c.total > 0 || c.grupo === 'Fijo').map((c, i) => ({ etiqueta: c.categoria, valor: c.total, color: PALETA[i % PALETA.length] }))} />
        </article>

        <article className="tarjeta">
          <h3>Detalle de tus finanzas</h3>
          <BarraApilada fmt={fmt} alto={44} segmentos={[
            { etiqueta: 'Ingreso', valor: r.ingresos, color: 'var(--ingreso)' },
            { etiqueta: 'Gasto', valor: r.gastos, color: 'var(--gasto)' },
            { etiqueta: 'Ahorro', valor: r.ahorro, color: 'var(--ahorro)' },
          ]} />
          <p className="pie">Libre después de gastos y ahorro: <b className={`num ${r.balance < 0 ? 'neg' : ''}`}>{fmt(r.balance)}</b></p>
        </article>

        <article className="tarjeta meta">
          <h3>Progreso de Meta de Ahorro</h3>
          <div className="meta-cuerpo">
            {r.metaAhorro > 0 ? (
              <p>{r.faltaMeta > 0 ? <>Te faltan <b className="num">{fmt(r.faltaMeta)}</b> para llegar a tu meta</> : <>¡Llegaste a tu meta de <b className="num">{fmt(r.metaAhorro)}</b>!</>}</p>
            ) : (
              <p>Define una meta de ahorro en <button className="enlace" onClick={() => irA('presupuesto')}>Arma tu presupuesto</button>.</p>
            )}
            <Anillo avance={r.avanceMeta} />
          </div>
        </article>

        <article className="tarjeta ancha">
          <div className="tarjeta-cab">
            <h3>Gastos presupuesto vs real</h3>
            <ul className="leyenda en-linea"><li><span className="punto" style={{ background: 'var(--pres)' }} />Presupuesto</li><li><span className="punto" style={{ background: 'var(--real)' }} />Real</li><li><span className="punto" style={{ background: 'var(--gasto)' }} />Real por encima</li></ul>
          </div>
          <ColumnasAgrupadas fmt={fmt} datos={real.map((g) => ({ etiqueta: g.grupo, a: presupuestoGrupo(cfg, g.grupo), b: g.total }))} />
          <div className="scroll-x"><table className="mini-tabla">
            <thead><tr><th>Grupo</th><th>Presupuesto</th><th>Real</th><th>Diferencia</th></tr></thead>
            <tbody>
              {real.map((g) => {
                const p = presupuestoGrupo(cfg, g.grupo);
                return <tr key={g.grupo}><td>{g.grupo}</td><td className="num">{fmt(p)}</td><td className="num">{fmt(g.total)}</td><td className={`num ${p - g.total < 0 ? 'neg' : ''}`}>{fmt(p - g.total)}</td></tr>;
              })}
            </tbody>
          </table></div>
        </article>

        <article className="tarjeta ancha">
          <div className="tarjeta-cab">
            <h3>Seguimiento x día</h3>
            <div className="filtros">
              <Filtro id="dia-tipo" etiqueta="Tipo" valor={tipoDia} opciones={['Ingreso', 'Gasto', 'Ahorro']} todos="Todos" onChange={(v) => { setTipoDia(v as Tipo | ''); setGrupoDia(''); }} />
              <Filtro id="dia-grupo" etiqueta="Grupo" valor={grupoDia} opciones={tipoDia ? GRUPOS[tipoDia] : []} todos="Todos" onChange={setGrupoDia} />
            </div>
          </div>
          <ColumnasDia fmt={fmt} etiqueta={diaMes} datos={dias.map((d) => ({ x: d.fecha, v: d.total }))} />
        </article>

        <article className="tarjeta ancha">
          <div className="tarjeta-cab">
            <h3>Detalle por grupo y categoría</h3>
            <div className="filtros">
              <Filtro id="det-tipo" etiqueta="Tipo" valor={tipoDet} opciones={['Ingreso', 'Gasto', 'Ahorro']} onChange={(v) => { setTipoDet(v as Tipo); setGrupoDet(''); }} />
              <Filtro id="det-grupo" etiqueta="Grupo" valor={grupoDet} opciones={GRUPOS[tipoDet]} todos="Todos" onChange={setGrupoDet} />
            </div>
          </div>
          <BarrasCategoria fmt={fmt} filas={detalle} presupuesto={tipoDet === 'Gasto' ? (g, c) => cfg.presupuesto[claveCat(g, c)] || 0 : undefined} />
          {tipoDet === 'Gasto' && <p className="pie">La rayita marca el presupuesto de cada categoría.</p>}
        </article>
      </div>
    </div>
  );
}

function Filtro({ id, etiqueta, valor, opciones, todos, onChange }: { id: string; etiqueta: string; valor: string; opciones: string[]; todos?: string; onChange: (v: string) => void }) {
  return (
    <label className="filtro" htmlFor={id}>
      <span>{etiqueta}</span>
      <select id={id} value={valor} onChange={(e) => onChange(e.target.value)} disabled={!opciones.length}>
        {todos !== undefined && <option value="">{todos}</option>}
        {opciones.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function Kpi({ titulo, valor, nota, icono, estado, accion }: { titulo: string; valor: string; nota: string; icono: string; estado?: 'mal'; accion?: () => void }) {
  return (
    <div className={`kpi ${estado ?? ''}`}>
      <Icono nombre={icono} />
      <div className="kpi-txt">
        <span className="kpi-titulo">{titulo}:</span>
        <span className="kpi-valor num">{valor}</span>
        {accion ? <button className="enlace kpi-nota" onClick={accion}>{nota}</button> : <span className="kpi-nota">{nota}</span>}
      </div>
    </div>
  );
}

function Icono({ nombre }: { nombre: string }) {
  const comun = { width: 40, height: 40, viewBox: '0 0 40 40', 'aria-hidden': true } as const;
  switch (nombre) {
    case 'calc':
      return (
        <svg {...comun}><rect x="7" y="3" width="26" height="34" rx="5" fill="var(--ink)" /><rect x="11" y="7" width="18" height="8" rx="2" fill="var(--c5)" />{[0, 1, 2].map((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={11 + c * 6.5} y={19 + r * 5.5} width="4.5" height="3.6" rx="1" fill={c === 2 ? 'var(--pres)' : 'var(--paper)'} />))}</svg>
      );
    case 'recibo':
      return (
        <svg {...comun}><path d="M9 4h18l4 4v28l-3-2-3 2-3-2-3 2-3-2-3 2-3-2z" fill="var(--pres)" /><rect x="13" y="12" width="13" height="2.4" rx="1" fill="var(--ink)" opacity=".55" /><rect x="13" y="18" width="10" height="2.4" rx="1" fill="var(--ink)" opacity=".55" /><text x="20" y="31" textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--ink)">$</text></svg>
      );
    case 'alcancia':
      return (
        <svg {...comun}><ellipse cx="20" cy="23" rx="13" ry="10" fill="var(--c4)" /><circle cx="27" cy="21" r="1.6" fill="var(--ink)" /><rect x="15" y="12" width="8" height="2" rx="1" fill="var(--ink)" opacity=".5" /><rect x="12" y="31" width="4" height="5" rx="1.5" fill="var(--c4)" /><rect x="24" y="31" width="4" height="5" rx="1.5" fill="var(--c4)" /><circle cx="20" cy="7" r="4.5" fill="var(--pres)" /></svg>
      );
    default:
      return (
        <svg {...comun}><rect x="10" y="6" width="16" height="12" rx="2" transform="rotate(-12 18 12)" fill="var(--ingreso)" /><rect x="5" y="13" width="30" height="22" rx="4" fill="var(--c6)" /><rect x="26" y="20" width="9" height="8" rx="3" fill="var(--ink)" /><circle cx="30" cy="24" r="1.6" fill="var(--paper)" /></svg>
      );
  }
}
