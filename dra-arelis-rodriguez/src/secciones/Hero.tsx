import { ArrowDown, CalendarHeart } from 'lucide-react';
import { FOTOS } from '../contenido';
import { EnlaceWhatsApp, EtiquetaIlustrativa } from '../componentes/Enlaces';
import { mensajeGeneral } from '../whatsapp';

export function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden pt-[4.5rem]">
      {/* Fondo: un arco suave, como una sonrisa, sin recargar */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -right-40 size-[38rem] rounded-full bg-salvia-claro/70 blur-3xl" />
        <div className="absolute bottom-0 -left-32 size-[26rem] rounded-full bg-arena blur-3xl" />
      </div>

      <div className="contenedor grid items-center gap-12 pt-10 pb-20 md:grid-cols-[1.05fr_0.95fr] md:gap-14 md:pt-16 md:pb-28 lg:gap-20">
        <div className="revelar max-w-xl">
          <p className="antetitulo">Atención odontológica</p>
          <h1 className="text-[2.75rem] leading-[1.04] font-normal sm:text-[3.6rem] lg:text-[4.35rem]">
            Tu sonrisa merece <em className="font-light text-salvia-oscuro italic">sentirse</em> bien.
          </h1>
          <p className="mt-6 max-w-[34rem] text-[1.12rem] leading-relaxed text-gris sm:text-[1.18rem]">
            Un espacio para cuidar tu salud bucal con atención profesional, cercanía y tranquilidad. Da el primer paso
            hacia una sonrisa que te haga sentir bien.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <EnlaceWhatsApp mensaje={mensajeGeneral()}>Quiero consultar por WhatsApp</EnlaceWhatsApp>
            <a href="#servicios" className="btn-secundario">
              Conocer los servicios
              <ArrowDown aria-hidden className="size-4" />
            </a>
          </div>
        </div>

        <figure className="revelar relative mx-auto w-full max-w-[30rem] md:max-w-none" style={{ '--retraso': '150ms' } as React.CSSProperties}>
          <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[2rem] bg-salvia-claro shadow-elevada">
            <img
              src={FOTOS.hero.src}
              alt={FOTOS.hero.alt}
              width={1200}
              height={1500}
              fetchPriority="high"
              className="size-full object-cover text-transparent"
              onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
            />
            {FOTOS.hero.ilustrativa && <EtiquetaIlustrativa className="absolute top-[18%] right-4" />}
          </div>
          <figcaption className="tarjeta absolute -bottom-6 left-4 flex items-center gap-3.5 px-5 py-4 sm:-left-6 sm:px-6">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-salvia-claro text-salvia-oscuro">
              <CalendarHeart aria-hidden className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-[0.95rem] font-semibold text-petroleo-oscuro">Agenda a tu ritmo</span>
              <span className="text-[0.85rem] text-gris">Escríbenos y coordinamos tu cita</span>
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
