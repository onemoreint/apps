import { Quote } from 'lucide-react';
import { FOTOS, MOSTRAR_PENDIENTES, NOMBRE, PERFIL, PROFESION } from '../contenido';
import { Pendiente } from '../componentes/Enlaces';

export function SobreMi() {
  const datos = PERFIL.filter((d) => d.valor || MOSTRAR_PENDIENTES);

  return (
    <section id="sobre-mi" aria-labelledby="titulo-sobre-mi" className="py-20 md:py-28">
      <div className="contenedor grid items-center gap-12 md:grid-cols-[0.9fr_1.1fr] md:gap-16 lg:gap-24">
        <div className="revelar relative mx-auto w-full max-w-[25rem]">
          <div aria-hidden className="absolute -inset-3 -z-10 rounded-t-[999px] rounded-b-[2.25rem] border border-salvia/35" />
          <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[2rem] bg-gradient-to-b from-salvia-claro to-arena">
            {FOTOS.doctora ? (
              <img src={FOTOS.doctora.src} alt={FOTOS.doctora.alt} loading="lazy" className="size-full object-cover" />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-5 p-8 text-center">
                <span
                  aria-hidden
                  className="grid size-32 place-items-center rounded-full border border-petroleo/15 bg-crema/70 font-serif text-[3.2rem] font-light text-petroleo italic"
                >
                  AR
                </span>
                <span className="sr-only">Monograma de {NOMBRE}</span>
                {MOSTRAR_PENDIENTES && <Pendiente>Espacio para la fotografía de la doctora</Pendiente>}
              </div>
            )}
          </div>
        </div>

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
              <span className="font-semibold text-tinta">{NOMBRE}</span> · {PROFESION}
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
