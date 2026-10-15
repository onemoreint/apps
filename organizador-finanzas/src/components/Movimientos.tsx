import { useEffect, useMemo, useRef, useState } from 'react';
import {
  GRUPOS, NOMBRE_TABLA, TIPOS, claveGrupo, mesDe, nuevoId, parseImporte, validarMovimiento, valor,
  type Catalogo, type ErroresMov, type Movimiento, type Tipo,
} from '../lib/finance';
import { fechaExcel, hoyISO, nombreMes } from '../lib/format';

interface Props {
  movimientos: Movimiento[];
  catalogo: Catalogo;
  mes: string;
  fmt: (n: number) => string;
  guardar: (m: Movimiento, esNuevo: boolean) => void;
  eliminar: (id: string) => void;
  exportarCSV: (todos: boolean) => void;
}

type Borrador = { fecha: string; detalle: string; tipo: Tipo | ''; grupo: string; categoria: string; importe: string };

const fechaPorDefecto = (mes: string) => (mesDe(hoyISO()) === mes ? hoyISO() : `${mes}-01`);
const vacio = (mes: string): Borrador => ({ fecha: fechaPorDefecto(mes), detalle: '', tipo: 'Gasto', grupo: '', categoria: '', importe: '' });

type Orden = { col: 'fecha' | 'detalle' | 'tipo' | 'grupo' | 'categoria' | 'importe'; dir: 1 | -1 };

export function Movimientos({ movimientos, catalogo, mes, fmt, guardar, eliminar, exportarCSV }: Props) {
  const [b, setB] = useState<Borrador>(() => vacio(mes));
  const [editId, setEditId] = useState<string | null>(null);
  const [errores, setErrores] = useState<ErroresMov>({});
  const [ok, setOk] = useState('');
  const [busca, setBusca] = useState('');
  const [fTipo, setFTipo] = useState<Tipo | ''>('');
  const [fGrupo, setFGrupo] = useState('');
  const [alcance, setAlcance] = useState<'mes' | 'todos'>('mes');
  const [orden, setOrden] = useState<Orden>({ col: 'fecha', dir: 1 });
  const [porBorrar, setPorBorrar] = useState<string | null>(null);
  const detalleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editId) setB((x) => ({ ...x, fecha: mesDe(x.fecha) === mes ? x.fecha : fechaPorDefecto(mes) }));
  }, [mes, editId]);

  const grupos = b.tipo ? GRUPOS[b.tipo] : [];
  const categorias = b.tipo && b.grupo ? catalogo[claveGrupo(b.tipo, b.grupo)] ?? [] : [];

  function set<K extends keyof Borrador>(k: K, v: Borrador[K]) {
    setB((x) => {
      const n = { ...x, [k]: v };
      // listas dependientes: al cambiar Tipo se limpia Grupo y Categoría; al cambiar Grupo, la Categoría
      if (k === 'tipo') {
        n.grupo = GRUPOS[v as Tipo]?.length === 1 ? GRUPOS[v as Tipo][0] : '';
        n.categoria = '';
      }
      if (k === 'grupo') n.categoria = '';
      return n;
    });
    setErrores((e) => ({ ...e, [k]: undefined }));
    setOk('');
  }

  function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validarMovimiento({ ...b, tipo: b.tipo || undefined }, catalogo);
    setErrores(e);
    if (Object.keys(e).length) return;
    const m: Movimiento = {
      id: editId ?? nuevoId(),
      fecha: b.fecha,
      detalle: b.detalle.trim(),
      tipo: b.tipo as Tipo,
      grupo: b.grupo,
      categoria: b.categoria,
      importe: b.importe.trim() === '' ? null : parseImporte(b.importe),
    };
    guardar(m, !editId);
    setOk(editId ? 'Movimiento actualizado.' : `Guardado: ${m.categoria} ${m.importe === null ? '(sin importe)' : fmt(m.importe)}.`);
    setEditId(null);
    // conserva fecha, tipo y grupo para registrar rápido el siguiente
    setB((x) => ({ ...x, detalle: '', categoria: '', importe: '' }));
    detalleRef.current?.focus();
  }

  function editar(m: Movimiento) {
    setEditId(m.id);
    setB({ fecha: m.fecha, detalle: m.detalle, tipo: m.tipo, grupo: m.grupo, categoria: m.categoria, importe: m.importe === null ? '' : String(m.importe) });
    setErrores({});
    setOk('');
    detalleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => detalleRef.current?.focus(), 250);
  }

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const r = movimientos.filter(
      (m) =>
        (alcance === 'todos' || mesDe(m.fecha) === mes) &&
        (!fTipo || m.tipo === fTipo) &&
        (!fGrupo || m.grupo === fGrupo) &&
        (!q || `${m.detalle} ${m.categoria} ${m.grupo}`.toLowerCase().includes(q)),
    );
    const k = orden.col;
    return r.sort((a, b2) => {
      const va = k === 'importe' ? valor(a) : a[k];
      const vb = k === 'importe' ? valor(b2) : b2[k];
      return (va < vb ? -1 : va > vb ? 1 : 0) * orden.dir;
    });
  }, [movimientos, alcance, mes, fTipo, fGrupo, busca, orden]);

  const totales = useMemo(() => {
    const t = { Ingreso: 0, Gasto: 0, Ahorro: 0 } as Record<Tipo, number>;
    for (const m of lista) t[m.tipo] += valor(m);
    return t;
  }, [lista]);

  const th = (col: Orden['col'], txt: string, cls = '') => (
    <th className={cls} aria-sort={orden.col === col ? (orden.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button className="th-btn" onClick={() => setOrden((o) => ({ col, dir: o.col === col ? (o.dir === 1 ? -1 : 1) : 1 }))}>
        {txt}<span className="flecha">{orden.col === col ? (orden.dir === 1 ? '▲' : '▼') : '↕'}</span>
      </button>
    </th>
  );

  return (
    <div className="movs">
      <form className="tarjeta form-mov" onSubmit={enviar} noValidate>
        <div className="tarjeta-cab">
          <h2>{editId ? 'Editar movimiento' : 'Registra tus ingresos, gastos y ahorros'}</h2>
          {editId && <button type="button" className="btn" onClick={() => { setEditId(null); setB(vacio(mes)); setErrores({}); }}>Cancelar edición</button>}
        </div>
        <div className="campos">
          <Campo id="f-fecha" etiqueta="Fecha" error={errores.fecha}>
            <input id="f-fecha" type="date" value={b.fecha} onChange={(e) => set('fecha', e.target.value)} required />
          </Campo>
          <Campo id="f-detalle" etiqueta="Detalle" error={errores.detalle} ayuda="Texto libre, por ejemplo: Rappi, Sueldo">
            <input id="f-detalle" ref={detalleRef} value={b.detalle} maxLength={120} onChange={(e) => set('detalle', e.target.value)} placeholder="¿Qué fue?" />
          </Campo>
          <Campo id="f-tipo" etiqueta="Tipo" error={errores.tipo}>
            <div className="segmentado" role="radiogroup" aria-label="Tipo">
              {TIPOS.map((t) => (
                <button type="button" key={t} role="radio" aria-checked={b.tipo === t} className={`seg ${t.toLowerCase()} ${b.tipo === t ? 'on' : ''}`} onClick={() => set('tipo', t)}>{t}</button>
              ))}
            </div>
          </Campo>
          <Campo id="f-grupo" etiqueta="Grupo" error={errores.grupo}>
            <select id="f-grupo" value={b.grupo} onChange={(e) => set('grupo', e.target.value)} disabled={!grupos.length}>
              <option value="">Elige…</option>
              {grupos.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Campo>
          <Campo id="f-cat" etiqueta="Categoría" error={errores.categoria} ayuda={b.tipo && b.grupo ? `Lista ${NOMBRE_TABLA[claveGrupo(b.tipo, b.grupo)]}` : 'Depende del grupo'}>
            <select id="f-cat" value={b.categoria} onChange={(e) => set('categoria', e.target.value)} disabled={!categorias.length}>
              <option value="">Elige…</option>
              {categorias.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Campo>
          <Campo id="f-imp" etiqueta="Importe" error={errores.importe} ayuda={b.importe && parseImporte(b.importe) !== null ? fmt(parseImporte(b.importe)!) : 'Vacío cuenta como $0'}>
            <input id="f-imp" inputMode="decimal" value={b.importe} onChange={(e) => set('importe', e.target.value)} placeholder="250000" className="num" />
          </Campo>
          <div className="campo accion">
            <button type="submit" className="btn primario grande">{editId ? 'Guardar cambios' : 'Agregar'}</button>
          </div>
        </div>
        <p className="estado-form" role="status" aria-live="polite">{ok}</p>
      </form>

      <section className="tarjeta">
        <div className="tarjeta-cab">
          <h2>Registro de movimientos</h2>
          <div className="filtros">
            <label className="filtro" htmlFor="m-alc"><span>Ver</span>
              <select id="m-alc" value={alcance} onChange={(e) => setAlcance(e.target.value as 'mes' | 'todos')}>
                <option value="mes">{nombreMes(mes)}</option>
                <option value="todos">Todos los meses</option>
              </select>
            </label>
            <label className="filtro" htmlFor="m-tipo"><span>Tipo</span>
              <select id="m-tipo" value={fTipo} onChange={(e) => { setFTipo(e.target.value as Tipo | ''); setFGrupo(''); }}>
                <option value="">Todos</option>{TIPOS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="filtro" htmlFor="m-grupo"><span>Grupo</span>
              <select id="m-grupo" value={fGrupo} onChange={(e) => setFGrupo(e.target.value)} disabled={!fTipo}>
                <option value="">Todos</option>{fTipo && GRUPOS[fTipo].map((g) => <option key={g}>{g}</option>)}
              </select>
            </label>
            <label className="filtro buscar" htmlFor="m-busca"><span>Buscar</span>
              <input id="m-busca" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Rappi, luz…" />
            </label>
            <button className="btn" onClick={() => exportarCSV(alcance === 'todos')}>Exportar CSV</button>
          </div>
        </div>

        <div className="scroll-x">
          <table className="tabla">
            <thead>
              <tr>
                {th('fecha', 'Fecha')}{th('detalle', 'Detalle')}{th('tipo', 'Tipo')}{th('grupo', 'Grupo')}{th('categoria', 'Categoría')}{th('importe', 'Importe', 'der')}
                <th><span className="sr">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 && (
                <tr><td colSpan={7} className="vacio">No hay movimientos con estos filtros.</td></tr>
              )}
              {lista.map((m) => (
                <tr key={m.id} className={editId === m.id ? 'editando' : ''}>
                  <td className="num">{fechaExcel(m.fecha)}</td>
                  <td>{m.detalle || <span className="tenue">—</span>}</td>
                  <td><span className={`etq ${m.tipo.toLowerCase()}`}>{m.tipo}</span></td>
                  <td>{m.grupo}</td>
                  <td>{m.categoria}</td>
                  <td className="num der">{m.importe === null ? <span className="tenue" title="Sin importe">$-</span> : fmt(m.importe)}</td>
                  <td className="acciones">
                    {porBorrar === m.id ? (
                      <span className="confirmar">
                        <button className="btn peligro chico" onClick={() => { eliminar(m.id); setPorBorrar(null); }}>Eliminar</button>
                        <button className="btn chico" onClick={() => setPorBorrar(null)}>No</button>
                      </span>
                    ) : (
                      <>
                        <button className="btn chico" onClick={() => editar(m)} aria-label={`Editar ${m.detalle || m.categoria}`}>Editar</button>
                        <button className="btn chico" onClick={() => setPorBorrar(m.id)} aria-label={`Eliminar ${m.detalle || m.categoria}`}>Borrar</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {lista.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5}>{lista.length} movimientos · Ingresos <b className="num">{fmt(totales.Ingreso)}</b> · Gastos <b className="num">{fmt(totales.Gasto)}</b> · Ahorros <b className="num">{fmt(totales.Ahorro)}</b></td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  );
}

function Campo({ id, etiqueta, error, ayuda, children }: { id: string; etiqueta: string; error?: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <div className={`campo ${error ? 'con-error' : ''}`}>
      <label htmlFor={id}>{etiqueta}</label>
      {children}
      {error ? <span className="error" role="alert">{error}</span> : ayuda ? <span className="ayuda">{ayuda}</span> : null}
    </div>
  );
}
