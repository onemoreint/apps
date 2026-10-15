import { useEffect, useState } from 'react';
import {
  ErrorAcceso, crearPerfil, fuerzaClave, iniciarSesion, recuperarConCodigo, validarClave, validarUsuario,
  type KV, type Sesion,
} from '../lib/seguridad';
import { descargar } from '../lib/storage';

type Vista = 'entrar' | 'crear' | 'recuperar';

interface Props {
  kv: KV;
  hayPerfiles: boolean;
  ultimoUsuario: string;
  motivo?: string;
  onSesion: (s: Sesion, codigo?: string) => void;
}

export function Acceso({ kv, hayPerfiles, ultimoUsuario, motivo, onSesion }: Props) {
  const [vista, setVista] = useState<Vista>(hayPerfiles ? 'entrar' : 'crear');
  return (
    <div className="acceso">
      <div className="acceso-caja">
        <div className="acceso-marca">
          <span className="marca-logo" aria-hidden="true">$</span>
          <div>
            <h1>Organizador de Finanzas</h1>
            <p>Tus datos se guardan cifrados solo en este dispositivo.</p>
          </div>
        </div>
        {motivo && vista === 'entrar' && <p className="chip aviso"><span className="chip-dot" />{motivo}</p>}
        {vista === 'entrar' && <Entrar kv={kv} ultimoUsuario={ultimoUsuario} onSesion={onSesion} ir={setVista} />}
        {vista === 'crear' && <Crear kv={kv} primero={!hayPerfiles} onSesion={onSesion} ir={setVista} />}
        {vista === 'recuperar' && <Recuperar kv={kv} ultimoUsuario={ultimoUsuario} onSesion={onSesion} ir={setVista} />}
      </div>
    </div>
  );
}

function useEnvio() {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [espera, setEspera] = useState(0);
  useEffect(() => {
    if (espera <= 0) return;
    const t = setInterval(() => setEspera((e) => Math.max(0, e - 1000)), 1000);
    return () => clearInterval(t);
  }, [espera > 0]); // eslint-disable-line react-hooks/exhaustive-deps
  async function correr(f: () => Promise<void>) {
    setOcupado(true);
    setError('');
    try {
      await f();
    } catch (e) {
      const x = e as ErrorAcceso;
      setError(x.message || 'Algo salió mal. Intenta de nuevo.');
      if (x.esperaMs) setEspera(x.esperaMs);
    } finally {
      setOcupado(false);
    }
  }
  return { ocupado, error, setError, espera, correr };
}

function CampoClave({ id, etiqueta, valor, onChange, auto, mostrarFuerza }: { id: string; etiqueta: string; valor: string; onChange: (v: string) => void; auto: string; mostrarFuerza?: boolean }) {
  const [ver, setVer] = useState(false);
  const f = fuerzaClave(valor);
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <div className="clave-fila">
        <input id={id} type={ver ? 'text' : 'password'} value={valor} onChange={(e) => onChange(e.target.value)} autoComplete={auto} maxLength={128} />
        <button type="button" className="btn chico" onClick={() => setVer((v) => !v)} aria-pressed={ver}>{ver ? 'Ocultar' : 'Ver'}</button>
      </div>
      {mostrarFuerza && valor && (
        <span className="fuerza" data-nivel={f}>
          <span className="fuerza-barra"><i style={{ width: `${(f / 4) * 100}%` }} /></span>
          {['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte'][f]}
        </span>
      )}
    </div>
  );
}

function Entrar({ kv, ultimoUsuario, onSesion, ir }: { kv: KV; ultimoUsuario: string; onSesion: Props['onSesion']; ir: (v: Vista) => void }) {
  const [usuario, setUsuario] = useState(ultimoUsuario);
  const [clave, setClave] = useState('');
  const { ocupado, error, espera, correr } = useEnvio();
  useEffect(() => { if (ultimoUsuario) document.getElementById('a-clave')?.focus(); }, [ultimoUsuario]);
  return (
    <form
      className="acceso-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!usuario.trim() || !clave) return;
        correr(async () => {
          const s = await iniciarSesion(kv, usuario, clave);
          setClave('');
          onSesion(s);
        });
      }}
    >
      <h2>Iniciar sesión</h2>
      <div className="campo">
        <label htmlFor="a-usuario">Usuario</label>
        <input id="a-usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} />
      </div>
      <CampoClave id="a-clave" etiqueta="Contraseña" valor={clave} onChange={setClave} auto="current-password" />
      {error && <p className="error" role="alert">{error}{espera > 0 && ` (${Math.ceil(espera / 1000)} s)`}</p>}
      <button className="btn primario grande" disabled={ocupado || espera > 0 || !usuario.trim() || !clave}>
        {ocupado ? 'Verificando…' : 'Entrar'}
      </button>
      <div className="acceso-enlaces">
        <button type="button" className="enlace" onClick={() => ir('recuperar')}>Olvidé mi contraseña</button>
        <button type="button" className="enlace" onClick={() => ir('crear')}>Crear otro perfil en este dispositivo</button>
      </div>
    </form>
  );
}

function Crear({ kv, primero, onSesion, ir }: { kv: KV; primero: boolean; onSesion: Props['onSesion']; ir: (v: Vista) => void }) {
  const [nombre, setNombre] = useState('');
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [clave2, setClave2] = useState('');
  const { ocupado, error, setError, correr } = useEnvio();
  const eu = usuario ? validarUsuario(usuario) : null;
  const ec = clave ? validarClave(clave, usuario) : null;
  return (
    <form
      className="acceso-form"
      onSubmit={(e) => {
        e.preventDefault();
        const err = validarUsuario(usuario) ?? validarClave(clave, usuario) ?? (clave !== clave2 ? 'Las contraseñas no coinciden.' : null);
        if (err) return setError(err);
        correr(async () => {
          const r = await crearPerfil(kv, { usuario, nombre, clave });
          onSesion(r.sesion, r.codigo);
        });
      }}
    >
      <h2>{primero ? 'Crea tu perfil' : 'Nuevo perfil'}</h2>
      {primero && <p className="pie">Cada perfil tiene sus propias finanzas. Nadie más que use este dispositivo puede verlas sin tu contraseña.</p>}
      <div className="campo">
        <label htmlFor="c-nombre">Tu nombre</label>
        <input id="c-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" maxLength={40} placeholder="Opcional" />
      </div>
      <div className="campo">
        <label htmlFor="c-usuario">Usuario</label>
        <input id="c-usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} />
        {eu ? <span className="error">{eu}</span> : <span className="ayuda">Letras sin tilde, números, punto o guion. Ej.: jose.lugo</span>}
      </div>
      <CampoClave id="c-clave" etiqueta="Contraseña" valor={clave} onChange={setClave} auto="new-password" mostrarFuerza />
      {ec && <span className="error">{ec}</span>}
      <CampoClave id="c-clave2" etiqueta="Repite la contraseña" valor={clave2} onChange={setClave2} auto="new-password" />
      {clave2 && clave !== clave2 && <span className="error">Las contraseñas no coinciden.</span>}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn primario grande" disabled={ocupado}>{ocupado ? 'Creando perfil seguro…' : 'Crear perfil'}</button>
      {!primero && (
        <div className="acceso-enlaces">
          <button type="button" className="enlace" onClick={() => ir('entrar')}>Ya tengo perfil: iniciar sesión</button>
        </div>
      )}
    </form>
  );
}

function Recuperar({ kv, ultimoUsuario, onSesion, ir }: { kv: KV; ultimoUsuario: string; onSesion: Props['onSesion']; ir: (v: Vista) => void }) {
  const [usuario, setUsuario] = useState(ultimoUsuario);
  const [codigo, setCodigo] = useState('');
  const [clave, setClave] = useState('');
  const { ocupado, error, setError, espera, correr } = useEnvio();
  return (
    <form
      className="acceso-form"
      onSubmit={(e) => {
        e.preventDefault();
        const err = validarClave(clave, usuario);
        if (err) return setError(err);
        correr(async () => {
          const r = await recuperarConCodigo(kv, usuario, codigo, clave);
          onSesion(r.sesion, r.codigo);
        });
      }}
    >
      <h2>Recuperar acceso</h2>
      <p className="pie">Usa el código de recuperación que guardaste al crear tu perfil. Sin ese código no se pueden recuperar los datos, porque están cifrados.</p>
      <div className="campo">
        <label htmlFor="r-usuario">Usuario</label>
        <input id="r-usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoCapitalize="none" spellCheck={false} autoComplete="username" />
      </div>
      <div className="campo">
        <label htmlFor="r-codigo">Código de recuperación</label>
        <input id="r-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="XXXXX-XXXXX-XXXXX-XXXXX" autoCapitalize="characters" spellCheck={false} className="codigo-input" />
      </div>
      <CampoClave id="r-clave" etiqueta="Nueva contraseña" valor={clave} onChange={setClave} auto="new-password" mostrarFuerza />
      {error && <p className="error" role="alert">{error}{espera > 0 && ` (${Math.ceil(espera / 1000)} s)`}</p>}
      <button className="btn primario grande" disabled={ocupado || espera > 0 || !usuario || !codigo || !clave}>{ocupado ? 'Verificando…' : 'Cambiar contraseña y entrar'}</button>
      <div className="acceso-enlaces">
        <button type="button" className="enlace" onClick={() => ir('entrar')}>Volver a iniciar sesión</button>
      </div>
    </form>
  );
}

/** Muestra el código de recuperación una sola vez y exige confirmar que se guardó. */
export function CodigoRecuperacion({ codigo, usuario, onListo }: { codigo: string; usuario: string; onListo: () => void }) {
  const [guardado, setGuardado] = useState(false);
  const [msg, setMsg] = useState('');
  const texto = `Organizador de Finanzas\nUsuario: ${usuario}\nCódigo de recuperación: ${codigo}\n\nGuárdalo en un lugar seguro. Sirve para entrar si olvidas tu contraseña.\n`;
  return (
    <div className="acceso">
      <div className="acceso-caja">
        <h2>Guarda tu código de recuperación</h2>
        <p>Si olvidas la contraseña, este código es la <b>única forma</b> de volver a entrar. No se puede mostrar de nuevo.</p>
        <output className="codigo" aria-label="Código de recuperación">{codigo}</output>
        <div className="botonera">
          <button className="btn" onClick={async () => {
            try { await navigator.clipboard.writeText(codigo); setMsg('Código copiado.'); }
            catch { const r = document.createRange(); const el = document.querySelector('.codigo'); if (el) { r.selectNodeContents(el); getSelection()?.removeAllRanges(); getSelection()?.addRange(r); } setMsg('Selecciónalo y cópialo manualmente.'); }
          }}>Copiar</button>
          <button className="btn" onClick={async () => { const r = await descargar(`codigo-recuperacion-${usuario}.txt`, texto); setMsg(r === 'ok' ? 'Archivo descargado.' : 'No se pudo descargar; cópialo o escríbelo.'); }}>Descargar .txt</button>
          <span className="estado-form" role="status">{msg}</span>
        </div>
        <label className="check" htmlFor="cr-ok">
          <input id="cr-ok" type="checkbox" checked={guardado} onChange={(e) => setGuardado(e.target.checked)} />
          <span>Ya lo guardé en un lugar seguro (foto, papel o gestor de contraseñas).</span>
        </label>
        <button className="btn primario grande" disabled={!guardado} onClick={onListo}>Continuar</button>
      </div>
    </div>
  );
}
