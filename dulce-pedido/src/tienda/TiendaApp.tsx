import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShoppingBag } from 'lucide-react';
import { slugTienda } from '@/config';
import { cargarCatalogo } from '@/datos/fuente';
import { unidadesCarrito } from '@/core/carrito';
import { useRuta, enlace } from '@/app/ruta';
import { useTienda } from './estado';
import { aplicarTema } from './tema';
import { Aviso, BannerDemo, BarraCarrito, WhatsAppFlotante } from './partes';
import { Inicio } from './Inicio';
import { CatalogoPagina } from './CatalogoPagina';
import { Ficha } from './Ficha';
import { Carrito } from './Carrito';
import { Pedido } from './Pedido';
import { Listo } from './Listo';
import { Privacidad } from './Privacidad';
import { Pie } from './Pie';

export function TiendaApp() {
  const slug = slugTienda();
  const catalogo = useTienda((s) => s.catalogo);
  const iniciar = useTienda((s) => s.iniciar);
  const lineas = useTienda((s) => s.lineas);
  const ruta = useRuta();
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'no-existe' | 'error'>('cargando');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setEstado('cargando');
    try {
      const c = await cargarCatalogo(slug);
      if (!c) {
        setEstado('no-existe');
        return;
      }
      iniciar(slug, c);
      aplicarTema(c.tienda.contenido?.colores);
      document.title = `${c.tienda.nombre} · ${c.tienda.contenido?.eslogan || 'Pedidos en línea'}`;
      setEstado('listo');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
      setEstado('error');
    }
  }, [slug, iniciar]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (estado === 'cargando' || (estado === 'listo' && !catalogo)) {
    return (
      <div className="grid min-h-dvh place-items-center bg-crema">
        <div className="flex flex-col items-center gap-3 text-tinta-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-rosa border-t-primario" />
          <p className="text-sm">Cargando el catálogo…</p>
        </div>
      </div>
    );
  }
  if (estado === 'no-existe') {
    return (
      <Mensaje titulo="Tienda no encontrada" texto="Revisa que el enlace esté completo o pide uno nuevo a la tienda." />
    );
  }
  if (estado === 'error' || !catalogo) {
    return (
      <Mensaje titulo="No pudimos cargar el catálogo" texto={error}>
        <button
          type="button"
          onClick={() => void cargar()}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primario px-5 py-3 font-semibold text-en-primario"
        >
          <RefreshCw size={18} /> Intentar de nuevo
        </button>
      </Mensaje>
    );
  }

  const [seccion = '', param = ''] = ruta.partes;
  const enFlujo = seccion === 'carrito' || seccion === 'pedido' || seccion === 'listo';
  const n = unidadesCarrito(lineas);
  const t = catalogo.tienda;

  let pagina;
  switch (seccion) {
    case 'catalogo':
      pagina = <CatalogoPagina catalogo={catalogo} categoria={ruta.q.get('c') ?? ''} busqueda={ruta.q.get('q') ?? ''} />;
      break;
    case 'p':
      pagina = <Ficha key={param} catalogo={catalogo} id={param} />;
      break;
    case 'carrito':
      pagina = <Carrito catalogo={catalogo} />;
      break;
    case 'pedido':
      pagina = <Pedido catalogo={catalogo} />;
      break;
    case 'listo':
      pagina = <Listo catalogo={catalogo} />;
      break;
    case 'privacidad':
      pagina = <Privacidad catalogo={catalogo} />;
      break;
    default:
      pagina = <Inicio catalogo={catalogo} />;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-crema">
      {t.demo && <BannerDemo />}
      <header className="sticky top-0 z-20 border-b border-linea/70 bg-crema/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <a href={enlace('/')} className="flex min-w-0 items-center gap-2.5">
            {t.contenido?.logo_url ? (
              <img src={t.contenido.logo_url} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-linea" />
            ) : (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primario font-display text-lg font-semibold text-en-primario">
                {t.nombre.trim().charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate font-display text-xl font-semibold text-primario">{t.nombre}</span>
          </a>
          <nav className="flex items-center gap-1">
            <a href={enlace('/catalogo')} className="hidden rounded-full px-3 py-2 text-sm font-medium text-tinta-2 hover:bg-crema-2 sm:block">
              Catálogo
            </a>
            <a
              href={enlace('/carrito')}
              aria-label={`Mi pedido, ${n} productos`}
              className="relative grid h-11 w-11 place-items-center rounded-full text-primario hover:bg-crema-2"
            >
              <ShoppingBag size={22} />
              {n > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-acento px-1 text-[11px] font-bold text-white">
                  {n}
                </span>
              )}
            </a>
          </nav>
        </div>
      </header>

      <main className={`flex-1 ${lineas.length > 0 && !enFlujo ? 'pb-24' : ''}`}>{pagina}</main>
      <Pie catalogo={catalogo} />
      <BarraCarrito catalogo={catalogo} oculta={enFlujo} />
      <WhatsAppFlotante numero={t.whatsapp} nombre={t.nombre} subir={lineas.length > 0 && !enFlujo} />
      <Aviso />
    </div>
  );
}

function Mensaje({ titulo, texto, children }: { titulo: string; texto: string; children?: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-crema px-6 text-center">
      <div className="max-w-sm">
        <h1 className="text-2xl font-semibold text-primario">{titulo}</h1>
        <p className="mt-2 text-tinta-2">{texto}</p>
        {children}
      </div>
    </div>
  );
}
