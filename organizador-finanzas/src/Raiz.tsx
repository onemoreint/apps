import { useEffect, useState } from 'react';
import App from './App';
import { Acceso, CodigoRecuperacion } from './components/Acceso';
import { abrirKV, listarPerfiles, type KV, type Sesion } from './lib/seguridad';

const ULTIMO = 'of:ultimo-usuario';
const leerUltimo = () => { try { return localStorage.getItem(ULTIMO) ?? ''; } catch { return ''; } };
const guardarUltimo = (u: string) => { try { localStorage.setItem(ULTIMO, u); } catch { /* nada */ } };

type Fase =
  | { t: 'cargando' }
  | { t: 'error'; msg: string }
  | { t: 'acceso'; motivo?: string }
  | { t: 'codigo'; sesion: Sesion; codigo: string }
  | { t: 'app'; sesion: Sesion };

/** Controla el acceso: nada de las finanzas se descifra ni se muestra sin iniciar sesión. */
export default function Raiz() {
  const [kv, setKv] = useState<{ kv: KV; tipo: string } | null>(null);
  const [hayPerfiles, setHayPerfiles] = useState(false);
  const [fase, setFase] = useState<Fase>({ t: 'cargando' });

  useEffect(() => {
    if (!globalThis.crypto?.subtle) {
      setFase({ t: 'error', msg: 'Este navegador no permite cifrar datos. Abre la app desde su enlace https:// o actualiza el navegador.' });
      return;
    }
    abrirKV().then(async (r) => {
      setKv(r);
      setHayPerfiles((await listarPerfiles(r.kv)).length > 0);
      setFase({ t: 'acceso' });
    }, () => setFase({ t: 'error', msg: 'No se pudo abrir el almacenamiento del navegador.' }));
  }, []);

  const entrar = (s: Sesion, codigo?: string) => {
    guardarUltimo(s.perfil.usuario);
    setHayPerfiles(true);
    setFase(codigo ? { t: 'codigo', sesion: s, codigo } : { t: 'app', sesion: s });
  };

  const salir = async (motivo?: string) => {
    if (kv) setHayPerfiles((await listarPerfiles(kv.kv)).length > 0);
    setFase({ t: 'acceso', motivo });
  };

  if (fase.t === 'cargando' || !kv) {
    if (fase.t === 'error') return <div className="cargando" role="alert"><p>{fase.msg}</p></div>;
    return <div className="cargando" role="status"><span className="spinner" />Cargando…</div>;
  }
  if (fase.t === 'error') return <div className="cargando" role="alert"><p>{fase.msg}</p></div>;
  if (fase.t === 'acceso')
    return <Acceso key={fase.motivo ?? 'a'} kv={kv.kv} hayPerfiles={hayPerfiles} ultimoUsuario={leerUltimo()} motivo={fase.motivo} onSesion={entrar} />;
  if (fase.t === 'codigo')
    return <CodigoRecuperacion codigo={fase.codigo} usuario={fase.sesion.perfil.usuario} onListo={() => setFase({ t: 'app', sesion: fase.sesion })} />;
  return (
    <App
      key={fase.sesion.perfil.id}
      kv={kv.kv}
      sesion={fase.sesion}
      destino={kv.tipo === 'memoria' ? 'memoria' : 'dispositivo'}
      onSesionCambia={(s) => setFase({ t: 'app', sesion: s })}
      onSalir={salir}
    />
  );
}
