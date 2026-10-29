import { ArrowUpRight, CirclePlus, Layers, ShieldCheck, Smile, Sparkles, Stethoscope, type LucideIcon } from 'lucide-react';
import { SERVICIOS, type IconoServicio } from '../contenido';
import { enlaceWhatsApp, mensajeServicio } from '../whatsapp';

const ICONOS: Record<IconoServicio, LucideIcon> = {
  valoracion: Stethoscope,
  limpieza: Sparkles,
  preventiva: ShieldCheck,
  restauracion: Layers,
  estetica: Smile,
  otros: CirclePlus,
};

export function Servicios() {
  return (
    <section id="servicios" aria-labelledby="titulo-servicios" className="bg-arena/60 py-20 md:py-28">
      <div className="contenedor">
        <div className="revelar mx-auto max-w-2xl text-center">
          <p className="antetitulo">Servicios</p>
          <h2 id="titulo-servicios" className="text-[2.2rem] leading-[1.1] sm:text-[2.8rem]">
            Encuentra la atención que tu sonrisa necesita.
          </h2>
          <p className="mt-5 text-[1.08rem] text-gris">
            Elige el tema sobre el que quieres consultar y te escribimos con la información y la disponibilidad.
          </p>
        </div>

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICIOS.map((s, i) => {
            const Icono = ICONOS[s.icono];
            return (
              <li
                key={s.nombre}
                className="revelar tarjeta group flex flex-col p-7 transition duration-500 hover:-translate-y-1 hover:border-salvia/60 hover:shadow-elevada sm:p-8"
                style={{ '--retraso': `${(i % 3) * 100}ms` } as React.CSSProperties}
              >
                <span className="grid size-[3.25rem] place-items-center rounded-full border border-salvia/40 bg-crema text-petroleo">
                  <Icono aria-hidden className="size-[1.35rem]" strokeWidth={1.6} />
                </span>
                <h3 className="mt-6 text-[1.4rem] leading-snug">{s.nombre}</h3>
                <p className="mt-2.5 flex-1 text-[1rem] text-gris">{s.descripcion}</p>
                <a
                  href={enlaceWhatsApp(mensajeServicio(s.enMensaje))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 inline-flex min-h-12 items-center justify-between gap-3 rounded-full border border-petroleo/20 px-5 py-3 text-[0.97rem] font-semibold text-petroleo-oscuro transition duration-300 group-hover:border-petroleo group-hover:bg-petroleo group-hover:text-white"
                >
                  Consultar este servicio
                  <ArrowUpRight aria-hidden className="size-[1.1rem] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  <span className="sr-only">: {s.nombre} (abre WhatsApp)</span>
                </a>
              </li>
            );
          })}
        </ul>

        <p className="revelar mt-10 text-center text-[0.95rem] text-gris">
          La disponibilidad de cada servicio y su indicación se confirman durante la valoración profesional.
        </p>
      </div>
    </section>
  );
}
