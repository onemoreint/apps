import { useRef, useState } from 'react';
import { GRUPOS, NOMBRE_TABLA, TIPOS, claveGrupo, type Estado, type Tipo } from '../lib/finance';

interface Props {
  estado: Estado;
  setEstado: (f: (e: Estado) => Estado) => void;
}

export function Catalogos({ estado, setEstado }: Props) {
  return (
    <div className="cats">
      <p className="pie intro">
        Estas seis listas alimentan las listas desplegables del registro, igual que las tablas Ingreso_Fijo … Gasto_NoEsencial del Excel.
        Renombrar una categoría actualiza también los movimientos y el presupuesto que la usan.
      </p>
      <div className="cats-rejilla">
        {TIPOS.flatMap((t) => GRUPOS[t].map((g) => <Lista key={`${t}${g}`} tipo={t} grupo={g} estado={estado} setEstado={setEstado} />))}
      </div>
    </div>
  );
}

function Lista({ tipo, grupo, estado, setEstado }: { tipo: Tipo; grupo: string } & Props) {
  const k = claveGrupo(tipo, grupo);
  const items = estado.catalogo[k] ?? [];
  const [nuevo, setNuevo] = useState('');
  const [error, setError] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [txtEdit, setTxtEdit] = useState('');
  const [porBorrar, setPorBorrar] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const usos = (c: string) => estado.movimientos.filter((m) => m.tipo === tipo && m.grupo === grupo && m.categoria === c).length;

  function agregar(e: React.FormEvent) {
    e.preventDefault();
    const n = nuevo.trim();
    if (!n) return setError('Escribe un nombre.');
    if (items.some((x) => x.toLowerCase() === n.toLowerCase())) return setError('Ya existe en esta lista.');
    setEstado((s) => ({ ...s, catalogo: { ...s.catalogo, [k]: [...items, n] } }));
    setNuevo('');
    setError('');
    inputRef.current?.focus();
  }

  function renombrar(viejo: string) {
    const n = txtEdit.trim();
    if (!n || n === viejo) return setEditando(null);
    if (items.some((x) => x !== viejo && x.toLowerCase() === n.toLowerCase())) return setError('Ya existe en esta lista.');
    setEstado((s) => {
      const meses = Object.fromEntries(
        Object.entries(s.meses).map(([mes, cfg]) => {
          const pres = { ...cfg.presupuesto };
          const kv = `${grupo}|${viejo}`;
          if (tipo === 'Gasto' && kv in pres) { pres[`${grupo}|${n}`] = pres[kv]; delete pres[kv]; }
          return [mes, { ...cfg, presupuesto: pres }];
        }),
      );
      return {
        ...s,
        meses,
        catalogo: { ...s.catalogo, [k]: items.map((x) => (x === viejo ? n : x)) },
        movimientos: s.movimientos.map((m) => (m.tipo === tipo && m.grupo === grupo && m.categoria === viejo ? { ...m, categoria: n } : m)),
      };
    });
    setEditando(null);
    setError('');
  }

  function mover(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const arr = [...items];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setEstado((s) => ({ ...s, catalogo: { ...s.catalogo, [k]: arr } }));
  }

  return (
    <section className="tarjeta lista-cat">
      <header>
        <h3>{tipo} · {grupo}</h3>
        <code>{NOMBRE_TABLA[k]}</code>
      </header>
      <ul>
        {items.map((c, i) => (
          <li key={c}>
            {editando === c ? (
              <form className="fila-edit" onSubmit={(e) => { e.preventDefault(); renombrar(c); }}>
                <input id={`ren-${k}-${i}`} aria-label={`Nuevo nombre para ${c}`} value={txtEdit} onChange={(e) => setTxtEdit(e.target.value)} autoFocus maxLength={40} />
                <button className="btn chico primario">OK</button>
                <button type="button" className="btn chico" onClick={() => setEditando(null)}>×</button>
              </form>
            ) : porBorrar === c ? (
              <span className="confirmar">
                <span className="tenue">{usos(c) ? `${usos(c)} movimientos la usan y quedarán sin categoría válida.` : '¿Quitar?'}</span>
                <button className="btn chico peligro" onClick={() => { setEstado((s) => ({ ...s, catalogo: { ...s.catalogo, [k]: items.filter((x) => x !== c) } })); setPorBorrar(null); }}>Quitar</button>
                <button className="btn chico" onClick={() => setPorBorrar(null)}>No</button>
              </span>
            ) : (
              <>
                <span className="cat-nombre">{c}{usos(c) > 0 && <small className="tenue"> · {usos(c)}</small>}</span>
                <span className="cat-acc">
                  <button className="icono-btn" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir ${c}`}>↑</button>
                  <button className="icono-btn" onClick={() => mover(i, 1)} disabled={i === items.length - 1} aria-label={`Bajar ${c}`}>↓</button>
                  <button className="icono-btn" onClick={() => { setEditando(c); setTxtEdit(c); }} aria-label={`Renombrar ${c}`}>✎</button>
                  <button className="icono-btn" onClick={() => setPorBorrar(c)} aria-label={`Quitar ${c}`}>✕</button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
      <form className="fila-nueva" onSubmit={agregar}>
        <input id={`nueva-${k}`} ref={inputRef} aria-label={`Nueva categoría en ${NOMBRE_TABLA[k]}`} placeholder="Nueva categoría" value={nuevo} maxLength={40} onChange={(e) => { setNuevo(e.target.value); setError(''); }} />
        <button className="btn chico">Agregar</button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
