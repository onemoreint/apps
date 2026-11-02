import { useEffect, useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import type { Catalogo } from '@/core/tipos';
import { enlace } from '@/app/ruta';
import { cop } from '@/core/dinero';
import { Chorreado, Cinta, Plato, Seccion, TarjetaProducto, useEfecto } from './partes';
import { Cotizacion } from './Cotizacion';
import { Ubicacion } from './Ubicacion';

function irA(id: string) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
}

export function Inicio({ catalogo }: { catalogo: Catalogo }) {
  const t = catalogo.tienda;
  const c = t.contenido ?? ({} as Catalogo['tienda']['contenido']);
  const destacados = catalogo.productos.filter((p) => p.destacado && p.disponible).slice(0, 8);
  const mostrar = destacados.length > 0 ? destacados : catalogo.productos.filter((p) => p.disponible).slice(0, 8);
  const pasos = (c.como_pedir ?? []).filter(Boolean);
  const faq = (c.faq ?? []).filter((f) => f.pregunta && f.respuesta);
  const testimonios = (c.testimonios ?? []).filter((x) => x.texto && x.nombre);
  const zonas = catalogo.zonas;
  // Portada: la foto que configuró la tienda o, si no hay, la del primer destacado con foto.
  const portada = c.banner_url || mostrar.find((p) => p.fotos[0])?.fotos[0] || '';
  const fotoCategoria = (id: string) =>
    catalogo.categorias.find((x) => x.id === id)?.foto_url ||
    (catalogo.productos.find((p) => p.categoria_id === id && p.fotos[0] && p.disponible)?.fotos[0] ??
      catalogo.productos.find((p) => p.categoria_id === id && p.fotos[0])?.fotos[0]);

  // El desplazamiento alimenta los efectos de la portada (variable --d, en píxeles).
  useEffect(() => {
    const raiz = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let cuadro = 0;
    const medir = () => {
      cuadro = 0;
      raiz.style.setProperty('--d', String(Math.round(window.scrollY)));
    };
    const alMover = () => {
      if (!cuadro) cuadro = requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener('scroll', alMover, { passive: true });
    return () => {
      window.removeEventListener('scroll', alMover);
      cancelAnimationFrame(cuadro);
      raiz.style.removeProperty('--d');
    };
  }, []);

  const titulo = c.eslogan || t.nombre;

  return (
    <>
      {/* Portada: guayaba que chorrea sobre la página, con la foto en un plato con blonda */}
      <section id="portada" className="relative z-[1] overflow-x-clip bg-acento text-en-acento">
        <div className="mx-auto grid max-w-6xl items-center gap-x-6 px-4 pt-8 sm:pt-12 md:grid-cols-[1.15fr_1fr]">
          <div className="pb-6 md:pb-16">
            <h1 className="text-[clamp(2.9rem,11.5vw,5.6rem)] leading-[1.02]" aria-label={titulo}>
              {titulo.split(/\s+/).map((palabra, i) => (
                <span key={i} aria-hidden>
                  <span className="palabra" style={{ '--n': i } as React.CSSProperties}>
                    {palabra}
                  </span>{' '}
                </span>
              ))}
            </h1>
            {c.mensaje_bienvenida && <p className="mt-5 max-w-lg text-[1.08rem] leading-relaxed sm:text-xl">{c.mensaje_bienvenida}</p>}
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <a href={enlace('/catalogo')} className="boton-maracuya px-7 py-3.5 text-lg">
                Ver catálogo
              </a>
              <a href="#como-pedir" onClick={irA('como-pedir')} className="py-2 font-bold underline decoration-2 underline-offset-4">
                Cómo pedir
              </a>
            </div>
            {c.ciudad && (
              <p className="mt-6 flex items-center gap-1.5 text-[15px] font-medium">
                <MapPin size={17} aria-hidden /> {c.ciudad}
              </p>
            )}
          </div>
          <div className="parallax-plato relative z-10 -mb-[12vw] -mr-[16vw] ml-auto w-[88vw] max-w-[600px] sm:-mr-[6vw] md:-mb-24 md:-mr-10 md:w-full">
            <Plato foto={portada} alt={t.nombre} referencia={t.demo} prioridad className="plato-portada w-full" />
          </div>
        </div>
      </section>
      <Chorreado />

      {/* Categorías en platos */}
      {catalogo.categorias.length > 0 && (
        <section className="sobre-chorreado mx-auto mt-[4vw] max-w-6xl px-4 pt-6 md:mt-0" aria-label="Categorías">
          <div className="sin-barra -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:gap-6">
            {catalogo.categorias.map((cat) => (
              <a key={cat.id} href={enlace(`/catalogo?c=${cat.id}`)} className="plato-categoria w-28 shrink-0 snap-start text-center sm:w-36">
                <Plato foto={fotoCategoria(cat.id) ?? ''} color="var(--color-rosa)" sinCalados className="w-full" />
                <span className="mt-2 block text-[15px] font-bold leading-tight text-primario">{cat.nombre}</span>
              </a>
            ))}
          </div>
          {t.demo && <p className="mt-1 text-right text-[11px] text-tinta-3">Fotos de referencia</p>}
        </section>
      )}

      {/* Vitrina de destacados */}
      {mostrar.length > 0 && (
        <Seccion titulo={destacados.length > 0 ? 'Los más pedidos' : 'Nuestros productos'}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-x-10 lg:grid-cols-4">
            {mostrar.map((p) => (
              <TarjetaProducto key={p.id} p={p} catalogo={catalogo} />
            ))}
          </div>
          <p className="mt-10 text-center">
            <a href={enlace('/catalogo')} className="font-bold text-acento underline decoration-2 underline-offset-4">
              Ver todo el catálogo
            </a>
          </p>
        </Seccion>
      )}

      <Cinta textos={catalogo.categorias.map((x) => x.nombre)} />

      {/* Cómo pedir: es una secuencia real, por eso va numerada */}
      {pasos.length > 0 && (
        <section id="como-pedir" className="-mt-7 bg-primario pt-4 text-en-primario">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
            <h2 className="text-[clamp(2rem,6vw,3.2rem)] leading-tight">Cómo hacer tu pedido</h2>
            <ol className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              {pasos.map((paso, i) => (
                <Paso key={i} numero={i + 1} texto={paso} />
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Entregas y anticipación */}
      <Seccion titulo="Entregas y pedidos anticipados">
        <div className="border-b-2 border-rosa">
          {c.info_anticipacion && (
            <Info titulo="Con anticipación">
              <p>{c.info_anticipacion}</p>
            </Info>
          )}
          <Info titulo="Recogida y domicilio">
            {c.info_entregas && <p>{c.info_entregas}</p>}
            {t.recogida && t.direccion_recogida && <p className="mt-2">Recogida: {t.direccion_recogida}</p>}
            {t.domicilio && zonas.length > 0 && (
              <ul className="mt-4 max-w-lg space-y-2 text-[15px]">
                {zonas.map((z) => (
                  <li key={z.id} className="flex items-baseline gap-2">
                    <span>{z.nombre}</span>
                    <span className="guia" aria-hidden />
                    <span className="precio shrink-0 font-bold text-primario">{z.tarifa === null ? 'Se cotiza' : cop(z.tarifa)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Info>
          {c.eventos_texto && (
            <Info titulo="Cumpleaños, reuniones y eventos">
              <p>{c.eventos_texto}</p>
              <a href="#cotizar" onClick={irA('cotizar')} className="mt-3 inline-block font-bold text-acento underline decoration-2 underline-offset-4">
                Solicitar cotización
              </a>
            </Info>
          )}
          {c.horario_texto && (
            <Info titulo="Horario de atención">
              <p>{c.horario_texto}</p>
            </Info>
          )}
        </div>
      </Seccion>

      {/* Cotización de pedidos especiales */}
      <div className="bg-rosa">
        <Seccion id="cotizar" titulo="Cotiza tu pedido especial">
          <div className="mx-auto max-w-3xl">
            <Cotizacion catalogo={catalogo} />
          </div>
        </Seccion>
      </div>

      {/* Dónde estamos */}
      {(c.direccion || typeof c.mapa_lat === 'number') && (
        <Seccion id="ubicacion" titulo="Dónde estamos">
          <Ubicacion catalogo={catalogo} />
        </Seccion>
      )}

      {/* Testimonios: solo si existen opiniones reales cargadas por la tienda */}
      {testimonios.length > 0 && (
        <div className="bg-papel">
          <Seccion titulo="Lo que dicen nuestros clientes">
            <div className="grid gap-8 md:grid-cols-3">
              {testimonios.map((x, i) => (
                <figure key={i}>
                  <blockquote className="text-xl font-medium leading-snug text-tinta">“{x.texto}”</blockquote>
                  <figcaption className="mt-3 font-bold text-acento">{x.nombre}</figcaption>
                </figure>
              ))}
            </div>
          </Seccion>
        </div>
      )}

      {/* Preguntas frecuentes */}
      {faq.length > 0 && (
        <Seccion titulo="Preguntas frecuentes">
          <div className="divide-y-2 divide-rosa border-y-2 border-rosa">
            {faq.map((f, i) => (
              <Pregunta key={i} pregunta={f.pregunta} respuesta={f.respuesta} />
            ))}
          </div>
        </Seccion>
      )}
    </>
  );
}

function Paso({ numero, texto }: { numero: number; texto: string }) {
  const ref = useEfecto<HTMLLIElement>();
  return (
    <li ref={ref} className="flex gap-4 sm:block">
      <span className="numero-paso font-display text-5xl leading-none text-maracuya sm:text-6xl" aria-hidden>
        {numero}
      </span>
      <p className="text-[1.05rem] sm:mt-3">{texto}</p>
    </li>
  );
}

function Info({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-x-8 gap-y-2 border-t-2 border-rosa py-5 md:grid-cols-[17rem_1fr]">
      <h3 className="font-sans text-lg font-extrabold leading-snug text-primario">{titulo}</h3>
      <div className="max-w-2xl text-[1.02rem] text-tinta-2">{children}</div>
    </div>
  );
}

function Pregunta({ pregunta, respuesta }: { pregunta: string; respuesta: string }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-expanded={abierta}
        onClick={() => setAbierta(!abierta)}
        className="flex w-full items-center justify-between gap-3 py-4 text-left text-[1.05rem] font-bold text-tinta"
      >
        {pregunta}
        <ChevronDown size={22} className={`shrink-0 text-acento transition ${abierta ? 'rotate-180' : ''}`} />
      </button>
      {abierta && <p className="aparecer max-w-2xl pb-4 text-[1.02rem] text-tinta-2">{respuesta}</p>}
    </div>
  );
}
