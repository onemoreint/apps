import { useRef } from "react";
import { m, useScroll, useSpring } from "framer-motion";
import { modules } from "../data/content";
import Reveal from "./ui/Reveal";
import Counter from "./ui/Counter";
import JoinLink from "./ui/JoinLink";

const TOTAL = modules.reduce((s, x) => s + x.minutes, 0);
let acc = 0;
const timed = modules.map((x) => {
  const from = acc;
  acc += x.minutes;
  return { ...x, from, to: acc };
});
const marks = [0, ...timed.map((x) => x.to)];

export default function Curriculum() {
  const line = useRef(null);
  const { scrollYProgress } = useScroll({ target: line, offset: ["start 72%", "end 72%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });

  return (
    <section id="programa" className="band band-rule bg-gradient-to-b from-deep/70 to-transparent">
      <div className="wrap">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Reveal>
            <h2 className="h-display h-section !max-w-[24ch]">4 horas que pueden transformar tu forma de trabajar.</h2>
          </Reveal>
          <p className="font-display leading-none">
            <span className="grad-text text-[3.2rem] font-bold sm:text-[4rem]"><Counter to={TOTAL} /></span>
            <span className="ml-2 text-mute">minutos en total</span>
          </p>
        </div>

        {/* Barra de 240 minutos, cada tramo a escala de su duración real */}
        <div className="mt-10">
          <div className="flex gap-[3px]">
            {timed.map((x) => (
              <a
                key={x.n}
                href={`#modulo-${x.n}`}
                style={{ flexGrow: x.minutes, flexBasis: 0, background: x.color }}
                aria-label={`Ir al módulo ${x.n}: ${x.title}, ${x.minutes} minutos`}
                className="flex h-14 min-w-0 flex-col items-center justify-center rounded-md font-display font-bold leading-none text-ink transition-[filter,transform] duration-200 first:rounded-l-xl last:rounded-r-xl last:text-white hover:-translate-y-0.5 hover:brightness-125 sm:h-16 [&:nth-child(3)]:text-white [&:nth-child(4)]:text-white"
              >
                <span className="text-lg sm:text-xl">{x.minutes}</span>
                <span className="mt-0.5 text-[0.65rem] font-medium">min</span>
              </a>
            ))}
          </div>
          <div className="relative mt-2 h-5 text-[0.72rem] tabular-nums text-mute" aria-hidden="true">
            {marks.map((v, i) => (
              <span
                key={v}
                className="absolute"
                style={{ left: `${(v / TOTAL) * 100}%`, transform: i === 0 ? "none" : i === marks.length - 1 ? "translateX(-100%)" : "translateX(-50%)" }}
              >
                {v}
              </span>
            ))}
          </div>
        </div>

        {/* Línea de tiempo */}
        <ol ref={line} className="relative mt-12 space-y-5 pl-9 sm:pl-14">
          <span aria-hidden="true" className="absolute bottom-3 left-[11px] top-3 w-0.5 bg-line sm:left-[19px]" />
          <m.span
            aria-hidden="true"
            style={{ scaleY, transformOrigin: "50% 0", background: "linear-gradient(#00C8FF,#1769FF,#8747FF)" }}
            className="absolute bottom-3 left-[11px] top-3 w-0.5 sm:left-[19px]"
          />
          {timed.map((x, i) => (
            <li key={x.n} id={`modulo-${x.n}`} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-9 top-7 h-6 w-6 rounded-full border-[3px] border-ink sm:-left-14 sm:h-10 sm:w-10"
                style={{ background: x.color, boxShadow: `0 0 18px ${x.color}` }}
              />
              <Reveal delay={i * 0.03} className="glass rounded-2xl p-5 sm:p-7">
                <div className="grid gap-5 md:grid-cols-[1fr_1.15fr] md:gap-8">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-3 text-sm font-medium text-mute">
                      <span className="font-display text-base font-bold text-tech">Módulo {String(x.n).padStart(2, "0")}</span>
                      <span className="tabular-nums">{x.minutes} minutos</span>
                    </p>
                    <h3 className="mt-2 font-display text-[1.35rem] font-bold uppercase leading-tight tracking-tight sm:text-2xl">{x.title}</h3>
                  </div>
                  <ul className="min-w-0 space-y-2 text-[0.97rem] leading-snug text-mute">
                    {x.topics.map((t) => (
                      <li key={t} className="flex gap-2.5">
                        <span aria-hidden="true" className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: x.color, boxShadow: `0 0 6px ${x.color}` }} />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>

        <div className="mt-10 sm:pl-14">
          <JoinLink location="programa" className="w-full sm:w-auto">Quiero participar</JoinLink>
        </div>
      </div>
    </section>
  );
}
