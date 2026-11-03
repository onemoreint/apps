import { ChevronDown } from "lucide-react";
import { m } from "framer-motion";
import JoinLink from "./ui/JoinLink";
import Counter from "./ui/Counter";
import NeuralBrain from "./effects/NeuralBrain";
import { DATE_NOTE } from "../config/site";

const stats = [
  { to: 4, suffix: "", label: "horas de formación" },
  { to: 100, suffix: "%", label: "enfoque práctico" },
  { to: 20, suffix: "", label: "participantes como grupo inicial de referencia" },
];

const rise = (delay) => ({
  initial: { opacity: 0.2, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.2, 0.7, 0.2, 1] },
});

export default function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden lg:min-h-[calc(100svh-4.25rem)]">
      <div
        className="absolute inset-x-0 top-0 h-[210px] lg:left-auto lg:right-0 lg:h-full lg:w-[50%]"
      >
        <NeuralBrain className="h-full w-full" />
      </div>
      <div className="wrap relative flex flex-col pb-10 pt-[196px] lg:min-h-[calc(100svh-4.25rem)] lg:justify-center lg:pb-8 lg:pt-12">
        <div className="max-w-[46rem] lg:max-w-[40rem]">
          <m.h1 {...rise(0)} className="h-display text-[clamp(1.85rem,3.75vw,3.3rem)]">
            La inteligencia artificial está transformando la educación.
            <span className="grad-text mt-3 block">¿Estás preparado para ser parte del cambio?</span>
          </m.h1>
          <m.p {...rise(0.12)} className="body-lg mt-5 max-w-[34rem]">
            Descubre cómo utilizar herramientas de inteligencia artificial para planificar tus clases, crear recursos didácticos y mejorar tu rendimiento profesional como docente.
          </m.p>
          <m.div {...rise(0.22)} className="mt-7 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <JoinLink location="hero" className="text-[1.05rem] sm:px-8">Quiero participar</JoinLink>
            <a href="#programa" className="btn btn-ghost">
              Descubrir el programa
              <ChevronDown className="h-5 w-5" aria-hidden="true" />
            </a>
          </m.div>
          <m.p {...rise(0.3)} className="mt-4 max-w-[34rem] text-sm leading-relaxed text-mute">{DATE_NOTE}</m.p>
        </div>

        <dl className="mt-9 grid max-w-[46rem] gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-3 lg:max-w-[40rem]">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-4 bg-deep/90 px-4 py-3 sm:flex-col sm:items-start sm:gap-1.5 sm:py-4">
              <dd className="grad-text w-[4.2rem] shrink-0 font-display text-[2rem] font-bold leading-none sm:w-auto sm:text-[2.5rem]">
                <Counter to={s.to} suffix={s.suffix} />
              </dd>
              <dt className="text-[0.84rem] leading-snug text-tech/90">{s.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
