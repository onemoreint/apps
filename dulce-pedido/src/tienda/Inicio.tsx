import { useState } from 'react';
import { ArrowRight, CalendarHeart, ChevronDown, Clock, PartyPopper, Truck } from 'lucide-react';
import type { Catalogo } from '@/core/tipos';
import { enlace } from '@/app/ruta';
import { cop } from '@/core/dinero';
import { EtiquetaReferencia, Seccion, SinFoto, TarjetaProducto } from './partes';
import { Cotizacion } from './Cotizacion';
import { Ubicacion } from './Ubicacion';

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

  return (
    <>
      {/* Portada */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-10 pt-8 sm:pt-12 md:grid-cols-[1.05fr_1fr] md:pb-16">
          <div className="aparecer order-2 md:order-1">
            {c.ciudad && <p className="mb-3 text-sm font-medium uppercase tracking-[0.14em] text-acento">{c.ciudad}</p>}
            <h1 className="text-[2.35rem] font-semibold leading-[1.05] text-primario sm:text-5xl md:text-[3.4rem]">
              {c.eslogan || t.nombre}
            </h1>
            {c.mensaje_bienvenida && <p className="mt-4 max-w-lg text-[1.05rem] text-tinta-2 sm:text-lg">{c.mensaje_bienvenida}</p>}
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={enlace('/catalogo')}
                className="inline-flex items-center gap-2 rounded-full bg-primario px-6 py-3.5 text-base font-semibold text-en-primario shadow-[0_10px_24px_-12px_rgba(46,29,21,0.7)] transition hover:brightness-110"
              >
                Ver catálogo <ArrowRight size={18} />
              </a>
              <a
                href="#como-pedir"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('como-pedir')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 font-semibold text-primario ring-1 ring-linea hover:bg-crema-2"
              >
                Cómo pedir
              </a>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <div className="relative overflow-hidden rounded-[28px] shadow-[0_30px_60px_-30px_rgba(46,29,21,0.5)] ring-1 ring-linea">
              {portada ? (
                <img src={portada} alt={t.nombre} className="aspect-[5/4] w-full object-cover" fetchPriority="high" />
              ) : (
                <SinFoto className="aspect-[5/4] w-full" />
              )}
              {portada && t.demo && <EtiquetaReferencia />}
            </div>
          </div>
        </div>
      </section>

      {/* Categorías con foto */}
      {catalogo.categorias.length > 0 && (
        <section className="mx-auto max-w-6xl px-4" aria-label="Categorías">
          <div className="sin-barra -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            {catalogo.categorias.map((cat) => {
              const foto = fotoCategoria(cat.id);
              return (
                <a
                  key={cat.id}
                  href={enlace(`/catalogo?c=${cat.id}`)}
                  className="group relative w-36 shrink-0 snap-start overflow-hidden rounded-2xl ring-1 ring-linea/70 sm:w-44"
                >
                  {foto ? (
                    <img src={foto} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <SinFoto className="aspect-[4/5] w-full" />
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3 pb-3 pt-10 text-[15px] font-semibold leading-tight text-white">
                    {cat.nombre}
                  </span>
                </a>
              );
            })}
          </div>
          {t.demo && <p className="mt-1 text-right text-[11px] text-tinta-3">Fotos de referencia</p>}
        </section>
      )}

      {/* Destacados */}
      {mostrar.length > 0 && (
        <Seccion titulo={destacados.length > 0 ? 'Los más pedidos' : 'Nuestros productos'}>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {mostrar.map((p) => (
              <TarjetaProducto key={p.id} p={p} catalogo={catalogo} />
            ))}
          </div>
          <div className="mt-6 text-center">
            <a href={enlace('/catalogo')} className="inline-flex items-center gap-1.5 font-semibold text-acento hover:underline">
              Ver todo el catálogo <ArrowRight size={16} />
            </a>
          </div>
        </Seccion>
      )}

      {/* Cómo pedir */}
      {pasos.length > 0 && (
        <div className="bg-papel">
          <Seccion id="como-pedir" titulo="Cómo hacer tu pedido">
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {pasos.map((paso, i) => (
                <li key={i} className="flex gap-3 rounded-2xl bg-crema p-4 ring-1 ring-linea/70">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primario font-display font-semibold text-en-primario">
                    {i + 1}
                  </span>
                  <p className="text-[15px] text-tinta-2">{paso}</p>
                </li>
              ))}
            </ol>
          </Seccion>
        </div>
      )}

      {/* Entregas y anticipación */}
      <Seccion titulo="Entregas y pedidos anticipados">
        <div className="grid gap-4 md:grid-cols-2">
          {c.info_anticipacion && (
            <Info icono={<Clock size={20} />} titulo="Con anticipación">
              <p>{c.info_anticipacion}</p>
            </Info>
          )}
          <Info icono={<Truck size={20} />} titulo="Recogida y domicilio">
            {c.info_entregas && <p>{c.info_entregas}</p>}
            {t.recogida && t.direccion_recogida && <p className="mt-2">Recogida: {t.direccion_recogida}</p>}
            {t.domicilio && zonas.length > 0 && (
              <ul className="mt-3 divide-y divide-linea/70 rounded-xl bg-crema ring-1 ring-linea/70">
                {zonas.map((z) => (
                  <li key={z.id} className="flex justify-between gap-3 px-3 py-2 text-[14px]">
                    <span>{z.nombre}</span>
                    <span className="precio shrink-0 font-semibold text-primario">{z.tarifa === null ? 'Se cotiza' : cop(z.tarifa)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Info>
          {c.eventos_texto && (
            <Info icono={<PartyPopper size={20} />} titulo="Cumpleaños, reuniones y eventos">
              <p>{c.eventos_texto}</p>
              <a
                href="#cotizar"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('cotizar')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-3 inline-flex items-center gap-1.5 font-semibold text-acento hover:underline"
              >
                Solicitar cotización <ArrowRight size={16} />
              </a>
            </Info>
          )}
          {c.horario_texto && (
            <Info icono={<CalendarHeart size={20} />} titulo="Horario de atención">
              <p>{c.horario_texto}</p>
            </Info>
          )}
        </div>
      </Seccion>

      {/* Cotización de pedidos especiales */}
      <div className="bg-papel">
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
            <div className="grid gap-4 md:grid-cols-3">
              {testimonios.map((x, i) => (
                <figure key={i} className="rounded-2xl bg-crema p-5 ring-1 ring-linea/70">
                  <blockquote className="font-display text-lg leading-snug text-tinta">“{x.texto}”</blockquote>
                  <figcaption className="mt-3 text-sm font-medium text-tinta-3">— {x.nombre}</figcaption>
                </figure>
              ))}
            </div>
          </Seccion>
        </div>
      )}

      {/* Preguntas frecuentes */}
      {faq.length > 0 && (
        <Seccion titulo="Preguntas frecuentes">
          <div className="divide-y divide-linea rounded-2xl bg-papel ring-1 ring-linea/70">
            {faq.map((f, i) => (
              <Pregunta key={i} pregunta={f.pregunta} respuesta={f.respuesta} />
            ))}
          </div>
        </Seccion>
      )}

    </>
  );
}

function Info({ icono, titulo, children }: { icono: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-papel p-5 ring-1 ring-linea/70">
      <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-primario">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-rosa text-primario">{icono}</span>
        {titulo}
      </h3>
      <div className="text-[15px] text-tinta-2">{children}</div>
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
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-semibold text-tinta"
      >
        {pregunta}
        <ChevronDown size={20} className={`shrink-0 text-tinta-3 transition ${abierta ? 'rotate-180' : ''}`} />
      </button>
      {abierta && <p className="aparecer px-5 pb-4 text-[15px] text-tinta-2">{respuesta}</p>}
    </div>
  );
}
