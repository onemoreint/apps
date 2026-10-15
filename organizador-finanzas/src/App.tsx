import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { aCSV, configVacia, delMes, mesAnterior, mesDe, mesesConDatos, type Estado, type MesConfig, type Movimiento } from './lib/finance';
import { estadoEjemplo, estadoVacio } from './lib/ejemplo';
import { dinero, hoyISO, nombreMes } from './lib/format';
import { almacenDeSesion, borrarLegado, descargar, leerLegado, type Destino } from './lib/storage';
import type { KV, Sesion } from './lib/seguridad';
import { Dashboard } from './components/Dashboard';
import { Movimientos } from './components/Movimientos';
import { Presupuesto } from './components/Presupuesto';
import { Catalogos } from './components/Catalogos';
import { Ajustes } from './components/Ajustes';

type Tab = 'dashboard' | 'movimientos' | 'presupuesto' | 'catalogos' | 'ajustes';
const TABS: { id: Tab; txt: string }[] = [
  { id: 'dashboard', txt: 'Dashboard' },
  { id: 'movimientos', txt: 'Registro de movimientos' },
  { id: 'presupuesto', txt: 'Arma tu presupuesto' },
  { id: 'catalogos', txt: 'Catálogos' },
  { id: 'ajustes', txt: 'Perfil y datos' },
];
const TAB_KEY = 'finanzas-mensual:tab';

const mesSiguiente = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
};

function ultimoMes(e: Estado) {
  const ms = mesesConDatos(e);
  return ms[ms.length - 1] ?? mesDe(hoyISO());
}

interface AppProps {
  kv: KV;
  sesion: Sesion;
  destino: Destino;
  onSesionCambia: (s: Sesion) => void;
  onSalir: (motivo?: string) => void;
}

export default function App({ kv, sesion, destino, onSesionCambia, onSalir }: AppProps) {
  const [estado, setEstadoRaw] = useState<Estado | null>(null);
  const [errorCarga, setErrorCarga] = useState('');
  const sesionRef = useRef(sesion);
  sesionRef.current = sesion;
  const almacen = useMemo(() => almacenDeSesion(kv, () => sesionRef.current, destino), [kv, destino]);
  const [mes, setMes] = useState('');
  const [tab, setTab] = useState<Tab>(() => {
    try { return (localStorage.getItem(TAB_KEY) as Tab) || 'dashboard'; } catch { return 'dashboard'; }
  });
  const [guardado, setGuardado] = useState<'ok' | 'guardando' | 'error'>('ok');
  const [toast, setToast] = useState<{ txt: string; deshacer?: () => void } | null>(null);
  const [esEjemplo, setEsEjemplo] = useState(false);
  const sucio = useRef(false);
  const estadoRef = useRef<Estado | null>(null);
  estadoRef.current = estado;

  // Carga inicial: datos del perfil; si es nuevo, los de la versión sin perfiles o el ejemplo del video
  useEffect(() => {
    let vivo = true;
    (async () => {
      let e: Estado | null;
      try {
        e = await almacen.cargar();
      } catch {
        if (vivo) setErrorCarga('No se pudieron descifrar los datos de este perfil. No se modificó nada.');
        return;
      }
      if (!vivo) return;
      let inicial = e;
      if (!inicial) {
        const legado = leerLegado();
        if (legado) {
          inicial = legado;
          sucio.current = true; // se guarda cifrado y luego se borra la copia sin cifrar
          setToast({ txt: 'Se importaron los datos que ya tenías en este navegador.' });
        }
      }
      setEsEjemplo(!inicial);
      inicial ??= estadoEjemplo();
      setEstadoRaw(inicial);
      setMes(ultimoMes(inicial));
    })();
    return () => { vivo = false; };
  }, [almacen]);

  const setEstado = useCallback((f: (e: Estado) => Estado) => {
    sucio.current = true;
    setEstadoRaw((e) => (e ? f(e) : e));
  }, []);

  // Autoguardado cifrado con pausa de 700 ms
  useEffect(() => {
    if (!estado || !sucio.current) return;
    setGuardado('guardando');
    const t = setTimeout(() => {
      almacen.guardar(estado).then(() => { sucio.current = false; setGuardado('ok'); borrarLegado(); }, () => setGuardado('error'));
    }, 700);
    return () => clearTimeout(t);
  }, [estado, almacen]);

  // Cerrar sesión guardando primero lo pendiente
  const salir = useCallback(async (motivo?: string) => {
    if (sucio.current && estadoRef.current) {
      try { await almacen.guardar(estadoRef.current); } catch { /* se intenta igual */ }
    }
    onSalir(motivo);
  }, [almacen, onSalir]);

  // Bloqueo automático por inactividad (también si la app estuvo en segundo plano)
  useEffect(() => {
    const min = sesion.perfil.autoBloqueo;
    if (!min) return;
    let ultimo = Date.now();
    const actividad = () => { ultimo = Date.now(); };
    const revisar = () => { if (Date.now() - ultimo > min * 60_000) salir('Sesión bloqueada por inactividad.'); };
    const eventos = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    eventos.forEach((ev) => window.addEventListener(ev, actividad, { passive: true }));
    const vis = () => { if (document.visibilityState === 'visible') revisar(); };
    document.addEventListener('visibilitychange', vis);
    const t = setInterval(revisar, 15_000);
    return () => {
      eventos.forEach((ev) => window.removeEventListener(ev, actividad));
      document.removeEventListener('visibilitychange', vis);
      clearInterval(t);
    };
  }, [sesion.perfil.autoBloqueo, salir]);

  useEffect(() => { try { localStorage.setItem(TAB_KEY, tab); } catch { /* sin almacenamiento */ } }, [tab]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 6000); return () => clearTimeout(t); }, [toast]);

  const fmt = useCallback((n: number) => dinero(n, estado?.ajustes.formato ?? 'excel'), [estado?.ajustes.formato]);
  const movsMes = useMemo(() => (estado ? delMes(estado.movimientos, mes) : []), [estado, mes]);
  const cfg: MesConfig = (estado && estado.meses[mes]) || configVacia();

  if (errorCarga) {
    return <div className="cargando" role="alert"><p>{errorCarga}</p><button className="btn" onClick={() => onSalir()}>Volver al inicio de sesión</button></div>;
  }
  if (!estado) {
    return <div className="cargando" role="status"><span className="spinner" />Abriendo tus finanzas…</div>;
  }

  const cambiarCfg = (c: MesConfig) => setEstado((e) => ({ ...e, meses: { ...e.meses, [mes]: c } }));

  const guardarMov = (m: Movimiento, esNuevo: boolean) => {
    setEstado((e) => ({ ...e, movimientos: esNuevo ? [...e.movimientos, m] : e.movimientos.map((x) => (x.id === m.id ? m : x)) }));
    if (mesDe(m.fecha) !== mes) setToast({ txt: `Guardado en ${nombreMes(mesDe(m.fecha))}.`, deshacer: () => setMes(mesDe(m.fecha)) });
  };

  const eliminarMov = (id: string) => {
    const previo = estado.movimientos;
    const m = previo.find((x) => x.id === id);
    setEstado((e) => ({ ...e, movimientos: e.movimientos.filter((x) => x.id !== id) }));
    setToast({ txt: `Eliminado: ${m?.detalle || m?.categoria}.`, deshacer: () => setEstado((e) => ({ ...e, movimientos: previo })) });
  };

  const exportarCSV = async (todos: boolean) => {
    const movs = todos ? estado.movimientos : movsMes;
    if (!movs.length) return setToast({ txt: 'No hay movimientos para exportar.' });
    const r = await descargar(todos ? 'movimientos-todos.csv' : `movimientos-${mes}.csv`, aCSV(movs));
    setToast({ txt: r === 'ok' ? 'CSV listo. Ábrelo con Excel o Google Sheets.' : r === 'cancelado' ? 'Descarga cancelada.' : 'Esta vista no permite descargar archivos.' });
  };

  const exportarJSON = async () => {
    const r = await descargar(`finanzas-respaldo-${hoyISO()}.json`, JSON.stringify(estado, null, 1));
    setToast({ txt: r === 'ok' ? 'Respaldo descargado.' : r === 'cancelado' ? 'Descarga cancelada.' : 'Esta vista no permite descargar archivos.' });
  };

  const meses = mesesConDatos(estado);

  return (
    <div className="app">
      <header className="barra">
        <div className="barra-in">
          <div className="marca">
            <span className="marca-logo" aria-hidden="true">$</span>
            <div>
              <h1>Análisis de Tus Finanzas Personales</h1>
              <span className="marca-sub">Organizador mensual</span>
            </div>
          </div>
          <div className="selector-mes" role="group" aria-label="Mes">
            <button className="icono-btn claro" onClick={() => setMes(mesAnterior(mes))} aria-label="Mes anterior">‹</button>
            <label htmlFor="sel-mes" className="sr">Mes</label>
            <input id="sel-mes" type="month" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} list="meses-datos" />
            <datalist id="meses-datos">{meses.map((m) => <option key={m} value={m} />)}</datalist>
            <button className="icono-btn claro" onClick={() => setMes(mesSiguiente(mes))} aria-label="Mes siguiente">›</button>
          </div>
          <div className="barra-usuario">
            <span className={`guardado ${guardado}`} role="status" title={almacen.destino === 'dispositivo' ? 'Guardado cifrado en este dispositivo' : 'Este navegador no permite guardar'}>
              {guardado === 'guardando' ? 'Guardando…' : guardado === 'error' ? 'No se pudo guardar' : almacen.destino === 'memoria' ? 'Sin guardar' : 'Guardado'}
            </span>
            <span className="usuario-chip" title={`Usuario: ${sesion.perfil.usuario}`}>{sesion.perfil.nombre}</span>
            <button className="btn chico claro" onClick={() => salir()}>Cerrar sesión</button>
          </div>
        </div>
        <nav className="pestanas" aria-label="Secciones">
          <div className="pestanas-in">
            {TABS.map((t) => (
              <button key={t.id} className={`pestana ${tab === t.id ? 'on' : ''}`} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
                {t.txt}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="contenido">
        {esEjemplo && (
          <div className="banda-ejemplo" role="note">
            <span><b>Datos de ejemplo:</b> los movimientos de marzo 2025 que aparecen en el video. El presupuesto y el saldo inicial son supuestos.</span>
            <span className="botonera">
              <button className="btn chico" onClick={() => { setEstado((e) => ({ ...e })); setEsEjemplo(false); }}>Seguir con el ejemplo</button>
              <button className="btn chico primario" onClick={() => { const v = estadoVacio(mesDe(hoyISO())); sucio.current = true; setEstadoRaw(v); setMes(mesDe(hoyISO())); setEsEjemplo(false); setTab('presupuesto'); }}>Empezar con mis datos</button>
            </span>
          </div>
        )}

        {tab === 'dashboard' && <Dashboard estado={estado} mes={mes} movsMes={movsMes} cfg={cfg} fmt={fmt} irA={setTab} />}
        {tab === 'movimientos' && (
          <Movimientos movimientos={estado.movimientos} catalogo={estado.catalogo} mes={mes} fmt={fmt} guardar={guardarMov} eliminar={eliminarMov} exportarCSV={exportarCSV} />
        )}
        {tab === 'presupuesto' && <Presupuesto estado={estado} mes={mes} cfg={cfg} fmt={fmt} cambiar={cambiarCfg} />}
        {tab === 'catalogos' && <Catalogos estado={estado} setEstado={setEstado} />}
        {tab === 'ajustes' && (
          <Ajustes
            estado={estado}
            destino={almacen.destino}
            kv={kv}
            sesion={sesion}
            onSesionCambia={onSesionCambia}
            onPerfilEliminado={() => onSalir('Perfil eliminado de este dispositivo.')}
            cambiarAjustes={(a) => setEstado((e) => ({ ...e, ajustes: a }))}
            reemplazar={(e, msg) => { sucio.current = true; setEstadoRaw(e); setMes(ultimoMes(e)); setEsEjemplo(false); setToast({ txt: msg }); }}
            cargarEjemplo={() => { const e = estadoEjemplo(); sucio.current = true; setEstadoRaw(e); setMes('2025-03'); setToast({ txt: 'Ejemplo del video cargado.' }); }}
            empezarVacio={() => { const v = estadoVacio(mesDe(hoyISO())); sucio.current = true; setEstadoRaw(v); setMes(mesDe(hoyISO())); setEsEjemplo(false); setToast({ txt: 'Listo, empiezas en blanco.' }); }}
            exportarJSON={exportarJSON}
          />
        )}
      </main>

      {toast && (
        <div className="toast" role="status">
          <span>{toast.txt}</span>
          {toast.deshacer && <button className="btn chico" onClick={() => { toast.deshacer!(); setToast(null); }}>{toast.txt.startsWith('Guardado en') ? 'Ir al mes' : 'Deshacer'}</button>}
        </div>
      )}
    </div>
  );
}
