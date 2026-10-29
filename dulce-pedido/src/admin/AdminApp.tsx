import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { BarChart3, CakeSlice, ExternalLink, Layers, LogOut, Receipt, Settings, Truck } from 'lucide-react';
import { CON_SERVIDOR } from '@/config';
import { enlace, ir, useRuta } from '@/app/ruta';
import { aplicarTema } from '@/tienda/tema';
import { PantallaCarga } from '@/tienda/LogoCarga';
import { db, textoError } from './cliente';
import { Boton, Campo, Entrada, Notas, notificar } from './ui';
import type { Membresia, TiendaFila } from './tipos';
import { Pedidos } from './Pedidos';
import { Productos } from './Productos';
import { Categorias } from './Categorias';
import { Entregas } from './Entregas';
import { Negocio } from './Negocio';
import { Estadisticas } from './Estadisticas';

const SECCIONES = [
  { id: 'pedidos', texto: 'Pedidos', icono: Receipt },
  { id: 'productos', texto: 'Productos', icono: CakeSlice },
  { id: 'categorias', texto: 'Categorías', icono: Layers },
  { id: 'entregas', texto: 'Entregas', icono: Truck },
  { id: 'negocio', texto: 'Mi negocio', icono: Settings },
  { id: 'estadisticas', texto: 'Estadísticas', icono: BarChart3 },
] as const;

export default function AdminApp() {
  if (!CON_SERVIDOR) {
    return (
      <Centro>
        <h1 className="text-2xl font-semibold text-primario">Panel no disponible en modo demostración</h1>
        <p className="mt-2 text-tinta-2">
          El panel necesita la base de datos (Supabase). Configura <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> y
          vuelve a compilar. Instrucciones en <code>docs/PUBLICAR.md</code>.
        </p>
        <a href={enlace('/')} className="mt-4 inline-block font-semibold text-acento">
          Volver a la tienda
        </a>
      </Centro>
    );
  }
  return <Panel />;
}

function Panel() {
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined);
  const [recuperando, setRecuperando] = useState(false);

  useEffect(() => {
    void db()
      .auth.getSession()
      .then(({ data }) => setSesion(data.session));
    const { data } = db().auth.onAuthStateChange((evento, s) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true);
      setSesion(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Tras volver de un enlace de correo, deja la dirección limpia en #/admin.
  useEffect(() => {
    if (sesion && /access_token=|type=recovery/.test(window.location.hash)) {
      history.replaceState(null, '', window.location.pathname + window.location.search + '#/admin');
    }
  }, [sesion]);

  if (sesion === undefined) return <PantallaCarga texto="Cargando el panel…" />;
  if (recuperando && sesion) return <NuevaClave alTerminar={() => setRecuperando(false)} />;
  if (!sesion) return <Ingreso />;
  return <Tiendas sesion={sesion} />;
}

function Ingreso() {
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [modo, setModo] = useState<'entrar' | 'recuperar'>('entrar');
  const [enviado, setEnviado] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      if (modo === 'entrar') {
        const { error: err } = await db().auth.signInWithPassword({ email: email.trim(), password: clave });
        if (err) throw err;
      } else {
        const destino = window.location.origin + window.location.pathname + window.location.search;
        const { error: err } = await db().auth.resetPasswordForEmail(email.trim(), { redirectTo: destino });
        if (err) throw err;
        setEnviado(true);
      }
    } catch (err) {
      setError(textoError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <Centro>
      <form onSubmit={entrar} className="w-full max-w-sm rounded-3xl bg-papel p-6 text-left ring-1 ring-linea/70">
        <h1 className="text-2xl font-semibold text-primario">{modo === 'entrar' ? 'Panel de la tienda' : 'Recuperar contraseña'}</h1>
        <p className="mt-1 text-sm text-tinta-2">
          {modo === 'entrar' ? 'Ingresa con el correo autorizado para administrar la tienda.' : 'Te enviaremos un enlace a tu correo.'}
        </p>
        <div className="mt-5 space-y-4">
          <Campo etiqueta="Correo">
            <Entrada type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Campo>
          {modo === 'entrar' && (
            <Campo etiqueta="Contraseña">
              <Entrada type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} />
            </Campo>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-peligro">
            {error}
          </p>
        )}
        {enviado && <p className="mt-3 text-sm font-medium text-exito">Si el correo está registrado, te llegará el enlace en unos minutos.</p>}
        <Boton type="submit" cargando={cargando} className="mt-5 w-full py-3">
          {modo === 'entrar' ? 'Entrar' : 'Enviar enlace'}
        </Boton>
        <button
          type="button"
          onClick={() => {
            setModo(modo === 'entrar' ? 'recuperar' : 'entrar');
            setError('');
            setEnviado(false);
          }}
          className="mt-3 w-full text-center text-sm font-medium text-acento hover:underline"
        >
          {modo === 'entrar' ? 'Olvidé mi contraseña' : 'Volver a ingresar'}
        </button>
        <a href={enlace('/')} className="mt-4 block text-center text-sm text-tinta-3 hover:underline">
          Ir a la tienda
        </a>
      </form>
    </Centro>
  );
}

function NuevaClave({ alTerminar }: { alTerminar: () => void }) {
  const [clave, setClave] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clave.length < 8) return setError('Usa al menos 8 caracteres.');
    setCargando(true);
    const { error: err } = await db().auth.updateUser({ password: clave });
    setCargando(false);
    if (err) return setError(textoError(err));
    notificar('Contraseña actualizada');
    alTerminar();
  };
  return (
    <Centro>
      <form onSubmit={guardar} className="w-full max-w-sm rounded-3xl bg-papel p-6 text-left ring-1 ring-linea/70">
        <h1 className="text-2xl font-semibold text-primario">Nueva contraseña</h1>
        <Campo etiqueta="Contraseña nueva" ayuda="Mínimo 8 caracteres." className="mt-4">
          <Entrada type="password" autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} />
        </Campo>
        {error && <p className="mt-3 text-sm font-medium text-peligro">{error}</p>}
        <Boton type="submit" cargando={cargando} className="mt-5 w-full py-3">
          Guardar
        </Boton>
      </form>
      <Notas />
    </Centro>
  );
}

function Tiendas({ sesion }: { sesion: Session }) {
  const [membresias, setMembresias] = useState<Membresia[] | null>(null);
  const [error, setError] = useState('');
  const [tiendaId, setTiendaId] = useState<string>(() => {
    try {
      return localStorage.getItem('dulce-pedido:panel:tienda') ?? '';
    } catch {
      return '';
    }
  });

  const cargar = useCallback(async () => {
    setError('');
    await db().rpc('dp_aceptar_invitaciones');
    const { data, error: err } = await db()
      .from('dp_miembros')
      .select('rol, tienda:dp_tiendas(id, slug, nombre, demo, activa, whatsapp, dias_atencion, dias_max_anticipacion, franjas, recogida, domicilio, direccion_recogida, contenido, meses_retencion)')
      .eq('user_id', sesion.user.id);
    if (err) return setError(textoError(err));
    setMembresias((data ?? []).filter((m) => m.tienda) as unknown as Membresia[]);
  }, [sesion.user.id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const salir = () => void db().auth.signOut();

  if (error) {
    return (
      <Centro>
        <p className="text-peligro">{error}</p>
        <Boton onClick={() => void cargar()} className="mt-3">
          Reintentar
        </Boton>
      </Centro>
    );
  }
  if (!membresias) return <PantallaCarga texto="Cargando tu tienda…" />;
  if (membresias.length === 0) {
    return (
      <Centro>
        <h1 className="text-2xl font-semibold text-primario">Tu cuenta no tiene una tienda asignada</h1>
        <p className="mt-2 text-tinta-2">
          Ingresaste como {sesion.user.email}. Pide al administrador del servicio que te invite con este correo.
        </p>
        <Boton variante="secundario" onClick={salir} className="mt-4">
          Cerrar sesión
        </Boton>
      </Centro>
    );
  }

  const actual = membresias.find((m) => m.tienda.id === tiendaId) ?? membresias[0]!;
  return (
    <Escritorio
      key={actual.tienda.id}
      membresia={actual}
      otras={membresias}
      elegir={(id) => {
        setTiendaId(id);
        try {
          localStorage.setItem('dulce-pedido:panel:tienda', id);
        } catch {
          /* sin almacenamiento */
        }
      }}
      recargar={cargar}
      salir={salir}
      email={sesion.user.email ?? ''}
    />
  );
}

function Escritorio({
  membresia,
  otras,
  elegir,
  recargar,
  salir,
  email,
}: {
  membresia: Membresia;
  otras: Membresia[];
  elegir: (id: string) => void;
  recargar: () => Promise<void>;
  salir: () => void;
  email: string;
}) {
  const ruta = useRuta();
  const seccion = SECCIONES.find((s) => s.id === ruta.partes[1])?.id ?? 'pedidos';
  const tienda: TiendaFila = membresia.tienda;
  const esPropietaria = membresia.rol === 'propietaria';
  const urlTienda = `${window.location.pathname}?tienda=${tienda.slug}#/`;

  useEffect(() => {
    aplicarTema(tienda.contenido?.colores);
    document.title = `Panel · ${tienda.nombre}`;
  }, [tienda]);

  let contenido;
  switch (seccion) {
    case 'productos':
      contenido = <Productos tienda={tienda} />;
      break;
    case 'categorias':
      contenido = <Categorias tienda={tienda} />;
      break;
    case 'entregas':
      contenido = <Entregas tienda={tienda} puedeEditar={esPropietaria} alGuardar={recargar} />;
      break;
    case 'negocio':
      contenido = <Negocio tienda={tienda} puedeEditar={esPropietaria} alGuardar={recargar} />;
      break;
    case 'estadisticas':
      contenido = <Estadisticas tienda={tienda} />;
      break;
    default:
      contenido = <Pedidos tienda={tienda} />;
  }

  return (
    <div className="min-h-dvh bg-crema">
      <header className="sticky top-0 z-20 border-b border-linea bg-papel/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primario font-display font-semibold text-en-primario">
              {tienda.nombre.charAt(0).toUpperCase()}
            </span>
            {otras.length > 1 ? (
              <select
                value={tienda.id}
                onChange={(e) => elegir(e.target.value)}
                className="min-w-0 truncate rounded-lg border-0 bg-transparent font-semibold text-primario focus:ring-2 focus:ring-acento"
                aria-label="Elegir tienda"
              >
                {otras.map((m) => (
                  <option key={m.tienda.id} value={m.tienda.id}>
                    {m.tienda.nombre}
                  </option>
                ))}
              </select>
            ) : (
              <span className="truncate font-semibold text-primario">{tienda.nombre}</span>
            )}
            {tienda.demo && <span className="rounded-full bg-rosa px-2 py-0.5 text-[11px] font-semibold text-primario">DEMO</span>}
          </div>
          <div className="flex items-center gap-1">
            <a
              href={urlTienda}
              target="_blank"
              rel="noopener"
              className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-tinta-2 hover:bg-crema-2 sm:inline-flex"
            >
              <ExternalLink size={16} /> Ver tienda
            </a>
            <button
              type="button"
              onClick={salir}
              title={`Cerrar sesión (${email})`}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-tinta-2 hover:bg-crema-2"
            >
              <LogOut size={16} /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
        <nav className="sin-barra mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2" aria-label="Secciones del panel">
          {SECCIONES.map((s) => {
            const Icono = s.icono;
            const activa = s.id === seccion;
            return (
              <a
                key={s.id}
                href={enlace(`/admin/${s.id}`)}
                aria-current={activa ? 'page' : undefined}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition ${
                  activa ? 'bg-primario text-en-primario' : 'text-tinta-2 hover:bg-crema-2'
                }`}
              >
                <Icono size={16} /> {s.texto}
              </a>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-5">
        {!esPropietaria && (seccion === 'negocio' || seccion === 'entregas') && (
          <p className="mb-4 rounded-xl bg-crema-2 px-4 py-3 text-sm text-tinta-2">Solo la propietaria puede cambiar esta configuración.</p>
        )}
        {contenido}
        <p className="mt-10 text-center text-xs text-tinta-3">
          <a href={urlTienda} target="_blank" rel="noopener" className="hover:underline sm:hidden">
            Ver tienda ·{' '}
          </a>
          <button type="button" className="hover:underline" onClick={() => ir('/admin/pedidos')}>
            Dulce Pedido · panel
          </button>
        </p>
      </main>
      <Notas />
    </div>
  );
}

function Centro({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-dvh place-items-center bg-crema px-4 py-10 text-center text-tinta-2">{<div className="flex w-full flex-col items-center">{children}</div>}</div>;
}
