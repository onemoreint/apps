import { useEffect, useRef, useState } from 'react';
import { leerRespaldo, type Ajustes as TAjustes, type Estado } from '../lib/finance';
import type { Destino } from '../lib/storage';
import { Seguridad } from './Seguridad';
import type { KV, Sesion } from '../lib/seguridad';

interface Props {
  estado: Estado;
  destino: Destino;
  cambiarAjustes: (a: TAjustes) => void;
  reemplazar: (e: Estado, msg: string) => void;
  cargarEjemplo: () => void;
  empezarVacio: () => void;
  exportarJSON: () => void;
  kv: KV;
  sesion: Sesion;
  onSesionCambia: (s: Sesion) => void;
  onPerfilEliminado: () => void;
}

const DESTINO_TXT: Record<Destino, string> = {
  dispositivo: 'Tus datos están cifrados con tu contraseña y guardados solo en este dispositivo. No viajan a ningún servidor. Si borras los datos del navegador o cambias de equipo, se pierden: descarga un respaldo de vez en cuando y llévalo al otro dispositivo con "Importar respaldo".',
  memoria: 'Este navegador no permite guardar (¿modo incógnito?). Los cambios duran mientras la página esté abierta: descarga un respaldo antes de cerrarla.',
};

export function Ajustes({ estado, destino, cambiarAjustes, reemplazar, cargarEjemplo, empezarVacio, exportarJSON, kv, sesion, onSesionCambia, onPerfilEliminado }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState('');
  const [confirmar, setConfirmar] = useState<'vacio' | 'ejemplo' | null>(null);
  const a = estado.ajustes;
  const [instalable, setInstalable] = useState(() => !!(window as unknown as { __instalar?: unknown }).__instalar);
  useEffect(() => {
    const f = () => setInstalable(true);
    window.addEventListener('instalable', f);
    return () => window.removeEventListener('instalable', f);
  }, []);
  const instalar = async () => {
    const ev = (window as unknown as { __instalar?: { prompt(): Promise<void> } }).__instalar;
    if (!ev) return;
    await ev.prompt();
    (window as unknown as { __instalar?: unknown }).__instalar = undefined;
    setInstalable(false);
  };

  function importar(f: File | undefined) {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const e = leerRespaldo(String(r.result));
        reemplazar(e, `Respaldo importado: ${e.movimientos.length} movimientos.`);
        setErr('');
      } catch (x) {
        setErr((x as Error).message);
      }
    };
    r.onerror = () => setErr('No se pudo leer el archivo.');
    r.readAsText(f);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="ajustes">
      <Seguridad kv={kv} sesion={sesion} onSesionCambia={onSesionCambia} onPerfilEliminado={onPerfilEliminado} />
      <section className="tarjeta">
        <h2>Tus datos</h2>
        <p className={`chip ${destino === 'dispositivo' ? 'bien' : 'aviso'}`}><span className="chip-dot" />{DESTINO_TXT[destino]}</p>
        <div className="botonera">
          <button className="btn primario" onClick={exportarJSON}>Descargar respaldo (.json)</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Importar respaldo</button>
          <input ref={fileRef} id="imp-json" type="file" accept=".json,application/json" hidden onChange={(e) => importar(e.target.files?.[0])} />
        </div>
        <p className="pie">El archivo de respaldo no va cifrado: guárdalo donde solo tú tengas acceso.</p>
        {err && <p className="error" role="alert">{err}</p>}
        <div className="botonera">
          {confirmar ? (
            <span className="confirmar">
              <span>{confirmar === 'vacio' ? 'Se borran todos tus movimientos y presupuestos.' : 'Se reemplazan tus datos por el ejemplo del video.'}</span>
              <button className="btn peligro" onClick={() => { (confirmar === 'vacio' ? empezarVacio : cargarEjemplo)(); setConfirmar(null); }}>Sí, continuar</button>
              <button className="btn" onClick={() => setConfirmar(null)}>Cancelar</button>
            </span>
          ) : (
            <>
              <button className="btn" onClick={() => setConfirmar('vacio')}>Empezar en blanco</button>
              <button className="btn" onClick={() => setConfirmar('ejemplo')}>Cargar ejemplo del video</button>
            </>
          )}
        </div>
      </section>

      <section className="tarjeta">
        <h2>Instalar en este dispositivo</h2>
        <p className="pie">Instalada, se abre como una app desde la pantalla de inicio y funciona sin internet.</p>
        {instalable ? (
          <div className="botonera"><button className="btn primario" onClick={instalar}>Instalar la app</button></div>
        ) : (
          <ul className="pie lista-instalar">
            <li><b>Android (Chrome):</b> menú ⋮ → "Instalar app" o "Agregar a pantalla principal".</li>
            <li><b>iPhone (Safari):</b> botón Compartir → "Agregar a inicio".</li>
            <li><b>Computadora (Chrome o Edge):</b> ícono de instalar en la barra de direcciones.</li>
          </ul>
        )}
      </section>

      <section className="tarjeta">
        <h2>Preferencias</h2>
        <div className="campo">
          <label htmlFor="aj-fmt">Formato de moneda</label>
          <select id="aj-fmt" value={a.formato} onChange={(e) => cambiarAjustes({ ...a, formato: e.target.value as TAjustes['formato'] })}>
            <option value="excel">Como el Excel: $3,240,410.00</option>
            <option value="co">Colombia: $ 3.240.410</option>
          </select>
        </div>
        <label className="check" htmlFor="aj-top5">
          <input id="aj-top5" type="checkbox" checked={a.top5ModoExcel} onChange={(e) => cambiarAjustes({ ...a, top5ModoExcel: e.target.checked })} />
          <span>
            <b>Top 5 idéntico al Excel.</b> El original repite la primera categoría empatada (en el video sale "Restaurantes $0.00" dos veces).
            Desactivado, la app muestra cinco categorías distintas.
          </span>
        </label>
      </section>

      <section className="tarjeta instrucciones">
        <h2>Instrucciones</h2>
        <ol>
          <li><b>Arma tu presupuesto</b> del mes: cuánto planeas gastar por categoría, tu meta de ahorro y el saldo con el que empiezas.</li>
          <li><b>Registra cada movimiento</b> con fecha, detalle, tipo (Ingreso, Gasto o Ahorro), grupo, categoría e importe. Las listas de grupo y categoría cambian según el tipo.</li>
          <li><b>Mira el tablero.</b> Se recalcula al instante: cuánto puedes gastar, cuánto llevas gastado y ahorrado, y en qué se va el dinero.</li>
          <li>Cambia de mes con el selector de arriba. Cada mes tiene su propio presupuesto; el registro es uno solo para todos los meses.</li>
        </ol>
        <h3>Cómo se calcula cada tarjeta</h3>
        <dl className="formulas">
          <dt>Gasto total</dt><dd>Σ importes con Tipo = Gasto en el mes.</dd>
          <dt>Tus ingresos</dt><dd>Σ importes con Tipo = Ingreso, repartidos por categoría.</dd>
          <dt>Vas ahorrando</dt><dd>Σ importes con Tipo = Ahorro.</dd>
          <dt>Puedes gastar</dt><dd>Σ presupuesto de gastos − Gasto total. <em>Hipótesis H1</em>: la hoja de presupuesto no aparece en el video, pero la fórmula cuadra con sus cifras.</dd>
          <dt>En total</dt><dd>Saldo inicial + Ingresos − Gastos. <em>Hipótesis H2</em>: cuadra con el video si el saldo inicial es $10.000.000.</dd>
          <dt>Meta de ahorro</dt><dd>Avance = Ahorro ÷ Meta. Te faltan = máx(0, Meta − Ahorro).</dd>
          <dt>5 gastos NoEsencial</dt><dd>Las cinco categorías del grupo NoEsencial con mayor gasto del mes.</dd>
        </dl>
      </section>
    </div>
  );
}
