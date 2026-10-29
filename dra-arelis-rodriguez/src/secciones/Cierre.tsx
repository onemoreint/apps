import { FOTOS, HORARIO, NOMBRE } from '../contenido';
import { EnlaceWhatsApp } from '../componentes/Enlaces';
import { mensajeGeneral } from '../whatsapp';

export function Cierre() {
  return (
    <section aria-labelledby="titulo-cierre" className="px-3 py-20 sm:px-5 md:py-28">
      <div className="revelar relative mx-auto max-w-[78rem] overflow-hidden rounded-[2rem] bg-petroleo-oscuro px-7 py-20 text-center sm:px-12 md:rounded-[2.5rem] md:py-28">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {/* Arco sutil, como una sonrisa */}
          <svg className="absolute -bottom-24 left-1/2 w-[64rem] -translate-x-1/2 text-white/[0.06]" viewBox="0 0 1000 300" fill="none">
            <path d="M40 40 C 260 300, 740 300, 960 40" stroke="currentColor" strokeWidth="60" strokeLinecap="round" />
          </svg>
          <div className="absolute -top-32 -left-24 size-80 rounded-full bg-salvia/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-2xl">
          <img
            src={FOTOS.doctora.avatar}
            alt={NOMBRE}
            width={96}
            height={96}
            loading="lazy"
            className="mx-auto mb-8 size-24 rounded-full object-cover ring-4 ring-white/15"
          />
          <h2 id="titulo-cierre" className="text-[2.3rem] leading-[1.1] !text-crema sm:text-[3.1rem]">
            Regálate un momento para cuidar de ti.
          </h2>
          <p className="mt-6 text-[1.12rem] text-crema/80">
            Si tienes preguntas o deseas consultar sobre una cita, estaré encantada de orientarte sobre cómo comenzar.
          </p>
          <EnlaceWhatsApp
            mensaje={mensajeGeneral()}
            className="btn mt-10 bg-crema px-8 text-[1.05rem] text-petroleo-oscuro shadow-elevada hover:bg-white"
          >
            Consultar por WhatsApp
          </EnlaceWhatsApp>
          <p className="mt-6 text-[0.95rem] text-crema/70">
            {HORARIO.dias}, {HORARIO.horas} · {HORARIO.nota}
          </p>
        </div>
      </div>
    </section>
  );
}
