import { useEffect, useState } from 'react';
import {
  GRUPOS, claveCat, claveGrupo, delMes, mesAnterior, parseImporte, porCategoria, presupuestoGrupo, presupuestoTotal, resumen,
  type Estado, type MesConfig,
} from '../lib/finance';
import { nombreMes } from '../lib/format';

interface Props {
  estado: Estado;
  mes: string;
  cfg: MesConfig;
  fmt: (n: number) => string;
  cambiar: (c: MesConfig) => void;
}

export function Presupuesto({ estado, mes, cfg, fmt, cambiar }: Props) {
  const movsMes = delMes(estado.movimientos, mes);
  const real = Object.fromEntries(porCategoria(movsMes, estado.catalogo, 'Gasto').map((f) => [claveCat(f.grupo, f.categoria), f.total]));
  const ant = mesAnterior(mes);
  const cfgAnt = estado.meses[ant];
  const cierreAnt = cfgAnt ? resumen(delMes(estado.movimientos, ant), cfgAnt).enTotal : null;
  const [msg, setMsg] = useState('');
  const r = resumen(movsMes, cfg);

  const setCat = (k: string, v: number) => cambiar({ ...cfg, presupuesto: { ...cfg.presupuesto, [k]: v } });

  return (
    <div className="pres">
      <section className="tarjeta pres-cab">
        <div>
          <h2>Arma tu presupuesto · {nombreMes(mes)}</h2>
          <p className="pie">Cada mes tiene su propio presupuesto, como las hojas "Mar - Arma tu presupuesto" del Excel.</p>
        </div>
        <div className="pres-totales">
          <Dato t="Presupuesto de gastos" v={fmt(presupuestoTotal(cfg))} />
          <Dato t="Gastado" v={fmt(r.gastos)} />
          <Dato t="Puedes gastar" v={fmt(r.puedesGastar)} mal={r.puedesGastar < 0} />
        </div>
        <div className="pres-acciones">
          <button className="btn" disabled={!cfgAnt} onClick={() => { cambiar({ ...cfg, presupuesto: { ...cfgAnt!.presupuesto }, metaAhorro: cfgAnt!.metaAhorro }); setMsg(`Copiado el presupuesto de ${nombreMes(ant)}.`); }}>
            Copiar de {nombreMes(ant, false)}
          </button>
          <button className="btn" disabled={cierreAnt === null} onClick={() => { cambiar({ ...cfg, saldoInicial: cierreAnt! }); setMsg(`Saldo inicial = cierre de ${nombreMes(ant)}.`); }}>
            Traer saldo de {nombreMes(ant, false)}
          </button>
          <span className="estado-form" role="status">{msg}</span>
        </div>
      </section>

      <section className="tarjeta pres-generales">
        <CampoMonto id="p-meta" etiqueta="Meta de ahorro del mes" valor={cfg.metaAhorro} fmt={fmt} onChange={(v) => cambiar({ ...cfg, metaAhorro: v })} ayuda="Alimenta el anillo de Progreso de Meta de Ahorro." />
        <CampoMonto id="p-saldo" etiqueta="Saldo inicial (acumulado anterior)" valor={cfg.saldoInicial} fmt={fmt} onChange={(v) => cambiar({ ...cfg, saldoInicial: v })} ayuda='Se suma a ingresos − gastos para la tarjeta "En total".' />
      </section>

      <div className="pres-grupos">
        {GRUPOS.Gasto.map((g) => {
          const cats = estado.catalogo[claveGrupo('Gasto', g)] ?? [];
          const pg = presupuestoGrupo(cfg, g);
          const rg = cats.reduce((a, c) => a + (real[claveCat(g, c)] ?? 0), 0);
          return (
            <section key={g} className="tarjeta">
              <div className="tarjeta-cab">
                <h3>Gasto {g}</h3>
                <span className="pie">Presupuesto <b className="num">{fmt(pg)}</b> · Real <b className={`num ${rg > pg && pg > 0 ? 'neg' : ''}`}>{fmt(rg)}</b></span>
              </div>
              <div className="scroll-x">
                <table className="tabla pres-tabla">
                  <thead><tr><th>Categoría</th><th className="der">Presupuesto</th><th className="der">Real</th><th>Uso</th></tr></thead>
                  <tbody>
                    {cats.map((c) => {
                      const k = claveCat(g, c);
                      const p = cfg.presupuesto[k] || 0;
                      const rr = real[k] ?? 0;
                      const uso = p > 0 ? rr / p : rr > 0 ? Infinity : 0;
                      return (
                        <tr key={c}>
                          <td>{c}</td>
                          <td className="der"><InputMonto id={`p-${g}-${c}`} valor={p} onChange={(v) => setCat(k, v)} etiqueta={`Presupuesto ${c}`} /></td>
                          <td className="num der">{rr ? fmt(rr) : <span className="tenue">$-</span>}</td>
                          <td className="uso-celda">
                            <span className="uso"><span className="uso-relleno" style={{ width: `${Math.min(1, uso === Infinity ? 1 : uso) * 100}%` }} data-estado={uso > 1 ? 'mal' : uso > 0.85 ? 'ojo' : 'bien'} /></span>
                            <span className="num uso-txt">{uso === Infinity ? 'sin pres.' : `${Math.round(uso * 100)}%`}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Dato({ t, v, mal }: { t: string; v: string; mal?: boolean }) {
  return (
    <div className="dato">
      <span>{t}</span>
      <b className={`num ${mal ? 'neg' : ''}`}>{v}</b>
    </div>
  );
}

/** Input de dinero que acepta 250000 / 250.000 / 250,000 y confirma al salir del campo. */
export function InputMonto({ id, valor, onChange, etiqueta }: { id: string; valor: number; onChange: (v: number) => void; etiqueta: string }) {
  const [txt, setTxt] = useState(valor ? String(valor) : '');
  const [err, setErr] = useState(false);
  useEffect(() => setTxt(valor ? String(valor) : ''), [valor]);
  const confirmar = () => {
    if (txt.trim() === '') { setErr(false); if (valor !== 0) onChange(0); return; }
    const n = parseImporte(txt);
    if (n === null || n < 0) { setErr(true); return; }
    setErr(false);
    if (n !== valor) onChange(n);
  };
  return (
    <input
      id={id} aria-label={etiqueta} aria-invalid={err} className={`num monto ${err ? 'invalido' : ''}`} inputMode="decimal"
      value={txt} placeholder="0" onChange={(e) => setTxt(e.target.value)} onBlur={confirmar}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      title={err ? 'Escribe un número positivo, por ejemplo 250000' : undefined}
    />
  );
}

function CampoMonto({ id, etiqueta, valor, onChange, ayuda, fmt }: { id: string; etiqueta: string; valor: number; onChange: (v: number) => void; ayuda: string; fmt: (n: number) => string }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <InputMonto id={id} valor={valor} onChange={onChange} etiqueta={etiqueta} />
      <span className="ayuda">{fmt(valor)} · {ayuda}</span>
    </div>
  );
}
