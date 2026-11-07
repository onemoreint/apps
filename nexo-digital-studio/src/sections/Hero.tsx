import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "../components/Button";
import { ParticleField } from "../components/ParticleField";
import { HeroVisual } from "./HeroVisual";
import { extraSolutions } from "../data/services";
import { useMediaQuery } from "../hooks/useMediaQuery";

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const reduced = useReducedMotion();
  const wide = useMediaQuery("(min-width: 1024px)");
  const { scrollY } = useScroll();
  // Parallax sutil del contenido al desplazarse.
  const yText = useTransform(scrollY, [0, 600], [0, reduced || !wide ? 0 : 60]);
  const yVisual = useTransform(scrollY, [0, 600], [0, reduced || !wide ? 0 : -40]);
  const fade = useTransform(scrollY, [0, 500], [1, reduced || !wide ? 1 : 0.35]);

  const line = (text: string, delay: number, gradient = false) => (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        className={`block ${gradient ? "text-gradient-animated" : ""}`}
        initial={reduced ? false : { y: "105%" }}
        animate={{ y: 0 }}
        transition={{ duration: 1, delay, ease }}
      >
        {text}
      </motion.span>
    </span>
  );

  return (
    <section id="inicio" className="relative isolate overflow-hidden pb-16 pt-28 sm:pt-36 lg:pb-24 lg:pt-40">
      {/* Fondo: rejilla, gradientes y partículas */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid mask-radial opacity-70" />
        <div className="absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-violet/25 blur-[120px]" />
        <div className="absolute -right-32 top-24 h-[480px] w-[480px] rounded-full bg-electric/15 blur-[120px]" />
        <ParticleField />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink" />
      </div>

      <div className="container-site grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
        <motion.div style={{ y: yText, opacity: fade }}>
          <motion.span
            className="eyebrow"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-electric opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-electric" />
            </span>
            Agencia digital · Web · IA
          </motion.span>

          <h1 className="mt-6 text-[clamp(2.45rem,7.2vw,4.9rem)] font-extrabold leading-[0.98] tracking-[-0.03em]">
            {line("TU NEGOCIO.", 0.1)}
            {line("EN OTRA DIMENSIÓN", 0.22, true)}
            {line("DIGITAL.", 0.34, true)}
          </h1>

          <motion.p
            className="mt-6 max-w-xl text-[17.5px] leading-relaxed text-mist sm:text-xl"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55, ease }}
          >
            Transformamos ideas y negocios en experiencias digitales inteligentes que conectan, impresionan y convierten.
          </motion.p>

          <motion.div
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease }}
          >
            <Button href="#contacto" className="w-full sm:w-auto">
              Digitalizar mi negocio <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button href="#servicios" variant="secondary" className="w-full sm:w-auto">
              Explorar soluciones
            </Button>
          </motion.div>

          <motion.ul
            className="mt-10 flex flex-wrap gap-x-5 gap-y-3 text-[14px] text-mist"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.95 }}
            aria-label="Soluciones"
          >
            {extraSolutions.map(({ label, icon: Icon }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-electric" /> {label}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div
          style={{ y: yVisual }}
          initial={reduced ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.25, ease }}
        >
          <HeroVisual />
        </motion.div>
      </div>

      <a href="#problema" aria-label="Seguir bajando" className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 text-mist hover:text-white lg:block">
        <ChevronDown className="h-6 w-6 animate-float-y" />
      </a>
    </section>
  );
}
