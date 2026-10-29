import { Quote } from 'lucide-react';
import { ESPECIALIDAD, FOTOS, MOSTRAR_PENDIENTES, NOMBRE, PERFIL } from '../contenido';
import { Pendiente } from '../componentes/Enlaces';

export function SobreMi() {
  const datos = PERFIL.filter((d) => d.valor || MOSTRAR_PENDIENTES);

  return (
    <section id="sobre-mi" aria-labelledby="titulo-sobre-mi" className="overflow-x-clip py-20 md:py-28">
      <div className="contenedor grid items-center gap-12 md:grid-cols-[0.9fr_1.1fr] md:gap-16 lg:gap-24">
        <figure className="revelar relative mx-auto w-full max-w-[22rem] sm:max-w-[26rem]">
          <div aria-hidden className="absolute -inset-4 rounded-full border border-salvia/40" />
          <div aria-hidden className="absolute -inset-9 -z-10 rounded-full bg-salvia-claro/60 blur-2xl" />
          <img
            src={FOTOS.doctora.retrato}
            alt={FOTOS.doctora.alt}
            width={880}
            height={880}
            loading="lazy"
            className="relative aspect-square w-full rounded-full object-cover shadow-elevada"
          />
          <figcaption className="tarjeta absolute -bottom-3 left-1/2 -translate-x-1/2 px-5 py-2.5 text-center whitespace-nowrap">
            <span className="block font-serif text-[1.05rem] text-petroleo-oscuro">{NOMBRE}</span>
            <span className="text-[0.8rem] tracking-wide text-gris">{ESPECIALIDAD}</span>
          </figcaption>
        </figure>

        <div className="revelar" style={{ '--retraso': '120ms' } as React.CSSProperties}>
          <p className="antetitulo">Sobre mí</p>
          <h2 id="titulo-sobre-mi" className="text-[2.2rem] leading-[1.1] sm:text-[2.8rem]">
            Un trato cercano comienza escuchándote.
          </h2>

          <blockquote className="relative mt-8 border-l-2 border-salvia pl-6">
            <Quote aria-hidden className="absolute -top-1 -left-[0.95rem] size-7 rounded-full bg-crema p-1 text-salvia" />
            <p className="font-serif text-[1.35rem] leading-snug text-petroleo-oscuro italic sm:text-[1.5rem]">
              Mi propósito es ofrecerte un espacio donde puedas hablar sobre tu salud bucal, resolver tus inquietudes y
              conocer las opciones de atención disponibles para ti.
            </p>
            <footer className="mt-4 text-[0.95rem] text-gris">
              <span className="font-semibold text-tinta">{NOMBRE}</span> · {ESPECIALIDAD}
            </footer>
          </blockquote>

          {datos.length > 0 && (
            <dl className="mt-10 grid gap-x-8 gap-y-5 border-t border-linea pt-8 sm:grid-cols-2">
              {datos.map((d) => (
                <div key={d.etiqueta}>
                  <dt className="text-[0.78rem] font-semibold tracking-[0.12em] text-salvia-oscuro uppercase">
                    {d.etiqueta}
                  </dt>
                  <dd className="mt-1.5 text-[1rem] text-tinta">{d.valor ?? <Pendiente>Por confirmar</Pendiente>}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
