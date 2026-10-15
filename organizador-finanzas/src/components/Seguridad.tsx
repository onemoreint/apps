import { useState } from 'react';
import {
  ErrorAcceso, actualizarPerfil, cambiarClave, eliminarPerfil, fuerzaClave, nuevoCodigoRecuperacion,
  type KV, type Sesion,
} from '../lib/seguridad';
import { descargar } from '../lib/storage';

interface Props {
  kv: KV;
  sesion: Sesion;
  onSesionCambia: (s: Sesion) => void;
  onPerfilEliminado: () => void;
}

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export function Seguridad({ kv, sesion, onSesionCambia, onPerfilEliminado }: Props) {
  const p = sesion.perfil;
  const [nombre, setNombre] = useState(p.nombre);
  const [panel, setPanel] = useState<'' | 'clave' | 'codigo' | 'eliminar'>('');
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [nueva2, setNueva2] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [codigo, setCodigo] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const limpiar = () => { setActual(''); setNueva(''); setNueva2(''); setErr(''); };
  const abrir = (x: typeof panel) => { limpiar(); setMsg(''); setCodigo(''); setPanel(panel === x ? '' : x); };

  async function correr(f: () => Promise<void>) {
    setOcupado(true); setErr('');
    try { await f(); } catch (e) { setErr((e as ErrorAcceso).message || 'No se pudo completar.'); } finally { setOcupado(false); }
  }

  return (
    <section className="tarjeta seguridad">
      <div className="tarjeta-cab">
        <h2>Tu perfil</h2>
        <span className="pie">Usuario <b>{p.usuario}</b> · creado {fecha(p.creado)}</span>
      </div>

      <div className="seg-fila">
        <div className="campo">
          <label htmlFor="s-nombre">Nombre visible</label>
          <div className="clave-fila">
            <input id="s-nombre" value={nombre} maxLength={40} onChange={(e) => setNombre(e.target.value)} />
            <button className="btn chico" disabled={!nombre.trim() || nombre === p.nombre} onClick={() => correr(async () => { onSesionCambia(await actualizarPerfil(kv, sesion, { nombre: nombre.trim() })); setMsg('Nombre actualizado.'); })}>Guardar</button>
          </div>
        </div>
        <div className="campo">
          <label htmlFor="s-bloqueo">Bloquear la sesión tras</label>
          <select id="s-bloqueo" value={p.autoBloqueo} onChange={(e) => correr(async () => { onSesionCambia(await actualizarPerfil(kv, sesion, { autoBloqueo: Number(e.target.value) })); setMsg('Bloqueo automático actualizado.'); })}>
            <option value={2}>2 minutos sin uso</option>
            <option value={5}>5 minutos sin uso</option>
            <option value={15}>15 minutos sin uso</option>
            <option value={60}>1 hora sin uso</option>
            <option value={0}>Nunca (no recomendado)</option>
          </select>
        </div>
      </div>

      <div className="botonera">
        <button className={`btn ${panel === 'clave' ? 'primario' : ''}`} onClick={() => abrir('clave')}>Cambiar contraseña</button>
        <button className={`btn ${panel === 'codigo' ? 'primario' : ''}`} onClick={() => abrir('codigo')}>Nuevo código de recuperación</button>
        <button className={`btn ${panel === 'eliminar' ? 'peligro' : ''}`} onClick={() => abrir('eliminar')}>Eliminar perfil</button>
      </div>

      {panel === 'clave' && (
        <form className="seg-panel" onSubmit={(e) => {
          e.preventDefault();
          if (nueva !== nueva2) return setErr('Las contraseñas nuevas no coinciden.');
          correr(async () => { onSesionCambia(await cambiarClave(kv, sesion, actual, nueva)); limpiar(); setPanel(''); setMsg('Contraseña cambiada. Úsala la próxima vez que entres.'); });
        }}>
          <Clave id="s-actual" etiqueta="Contraseña actual" v={actual} set={setActual} auto="current-password" />
          <Clave id="s-nueva" etiqueta="Nueva contraseña" v={nueva} set={setNueva} auto="new-password" fuerza />
          <Clave id="s-nueva2" etiqueta="Repite la nueva" v={nueva2} set={setNueva2} auto="new-password" />
          <button className="btn primario" disabled={ocupado || !actual || !nueva}>{ocupado ? 'Cifrando…' : 'Cambiar contraseña'}</button>
        </form>
      )}

      {panel === 'codigo' && !codigo && (
        <form className="seg-panel" onSubmit={(e) => { e.preventDefault(); correr(async () => { const r = await nuevoCodigoRecuperacion(kv, sesion, actual); onSesionCambia(r.sesion); setCodigo(r.codigo); limpiar(); }); }}>
          <p className="pie">El código anterior dejará de funcionar. Úsalo si perdiste el tuyo o crees que alguien lo vio.</p>
          <Clave id="s-cod-clave" etiqueta="Confirma tu contraseña" v={actual} set={setActual} auto="current-password" />
          <button className="btn primario" disabled={ocupado || !actual}>{ocupado ? 'Generando…' : 'Generar código nuevo'}</button>
        </form>
      )}
      {panel === 'codigo' && codigo && (
        <div className="seg-panel">
          <p>Tu nuevo código de recuperación. Guárdalo ahora: no se vuelve a mostrar.</p>
          <output className="codigo">{codigo}</output>
          <div className="botonera">
            <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(codigo); setMsg('Código copiado.'); } catch { setMsg('Selecciónalo y cópialo manualmente.'); } }}>Copiar</button>
            <button className="btn" onClick={() => descargar(`codigo-recuperacion-${p.usuario}.txt`, `Organizador de Finanzas\nUsuario: ${p.usuario}\nCódigo de recuperación: ${codigo}\n`)}>Descargar .txt</button>
            <button className="btn primario" onClick={() => { setCodigo(''); setPanel(''); setMsg('Código de recuperación renovado.'); }}>Ya lo guardé</button>
          </div>
        </div>
      )}

      {panel === 'eliminar' && (
        <form className="seg-panel peligro-zona" onSubmit={(e) => { e.preventDefault(); correr(async () => { await eliminarPerfil(kv, sesion, actual); onPerfilEliminado(); }); }}>
          <p><b>Se borran este perfil y todas sus finanzas de este dispositivo.</b> No se puede deshacer. Si quieres conservarlas, descarga antes un respaldo.</p>
          <Clave id="s-del-clave" etiqueta="Confirma tu contraseña" v={actual} set={setActual} auto="current-password" />
          <button className="btn peligro" disabled={ocupado || !actual}>{ocupado ? 'Eliminando…' : 'Eliminar definitivamente'}</button>
        </form>
      )}

      {err && <p className="error" role="alert">{err}</p>}
      <p className="estado-form" role="status">{msg}</p>
    </section>
  );
}

function Clave({ id, etiqueta, v, set, auto, fuerza }: { id: string; etiqueta: string; v: string; set: (x: string) => void; auto: string; fuerza?: boolean }) {
  const f = fuerzaClave(v);
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <input id={id} type="password" value={v} onChange={(e) => set(e.target.value)} autoComplete={auto} maxLength={128} />
      {fuerza && v && <span className="fuerza" data-nivel={f}><span className="fuerza-barra"><i style={{ width: `${(f / 4) * 100}%` }} /></span>{['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte'][f]}</span>}
    </div>
  );
}
