import { motion, useReducedMotion } from "motion/react";
import { AlertCircle, TrendingDown, Sparkles, ArrowRight, MessageSquareX, SearchX, Clock3, CheckCircle2 } from "lucide-react";
import { Reveal } from "../components/Reveal";
import { Button } from "../components/Button";

const pains = [
  { icon: SearchX, text: "Clientes que no encuentran precios ni productos" },
  { icon: MessageSquareX, text: "Los mismos mensajes respondidos una y otra vez" },
  { icon: Clock3, text: "Pedidos que se pierden entre conversaciones" },
];

const gains = [
  "Tu catálogo, precios e información siempre disponibles",
  "Pedidos y solicitudes que llegan ordenados a WhatsApp",
  "Una imagen profesional en cualquier dispositivo",
];

export function PasSection() {
  const reduced = useReducedMotion();
  return (
    <section id="problema" aria-labelledby="pas-title" className="relative py-20 sm:py-28">
      <div className="container-site">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* PROBLEMA */}
          <Reveal className="lg:col-span-7">
            <div className="relative h-full overflow-hidden rounded-[28px] border border-white/[0.07] bg-[linear-gradient(160deg,#141729,#0b0d18)] p-7 sm:p-10">
              <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-500/10 blur-3xl" />
              <span className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.2em] text-red-300/90">
                <AlertCircle className="h-4 w-4" /> El problema
              </span>
              <h2 id="pas-title" className="mt-5 text-[clamp(1.7rem,3.8vw,2.9rem)] font-bold leading-[1.1]">
                ¿Tu negocio todavía depende únicamente de <span className="text-gradient">redes sociales y mensajes</span> para conseguir clientes?
              </h2>
              <ul className="mt-8 grid gap-3 sm:grid-cols-3">
                {pains.map(({ icon: Icon, text }, i) => (
                  <motion.li
                    key={text}
                    initial={reduced ? false : { opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 + i * 0.1 }}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4"
                  >
                    <Icon className="h-5 w-5 text-red-300/80" />
                    <p className="mt-3 text-[14.5px] leading-snug text-mist-300">{text}</p>
                  </motion.li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* AGITACIÓN */}
          <Reveal className="lg:col-span-5" delay={0.12}>
            <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] border border-white/[0.07] bg-[linear-gradient(200deg,#1a1430,#0b0d18)] p-7 sm:p-10">
              <div>
                <span className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.2em] text-amber-300/90">
                  <TrendingDown className="h-4 w-4" /> Lo que está en juego
                </span>
                <p className="mt-5 text-[18px] leading-relaxed text-white/90 sm:text-xl">
                  Cuando tus clientes no encuentran tus productos, servicios, precios o información fácilmente, puedes perder oportunidades de venta.
                </p>
              </div>
              <p className="mt-8 border-l-2 border-violet pl-4 font-display text-[19px] font-semibold text-white sm:text-[22px]">
                Tu negocio necesita algo más que publicaciones.
              </p>
            </div>
          </Reveal>

          {/* SOLUCIÓN */}
          <Reveal className="lg:col-span-12" delay={0.1}>
            <div className="relative overflow-hidden rounded-[28px] p-[1px]">
              <div aria-hidden className="absolute inset-0 animate-gradient-pan bg-[linear-gradient(120deg,#7857FF,#28C5FF,#7857FF)] bg-[length:200%_200%]" />
              <div className="relative grid gap-8 rounded-[27px] bg-[linear-gradient(135deg,#120f2a_0%,#0b1426_100%)] p-7 sm:p-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
                <div>
                  <span className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.2em] text-electric-300">
                    <Sparkles className="h-4 w-4" /> La solución
                  </span>
                  <p className="mt-5 font-display text-[clamp(1.45rem,3vw,2.2rem)] font-semibold leading-[1.2]">
                    Creamos experiencias digitales para que tus clientes conozcan tu negocio, exploren tus productos y contacten contigo desde cualquier dispositivo.
                  </p>
                  <div className="mt-8">
                    <Button href="#contacto" className="w-full sm:w-auto">
                      Quiero transformar mi negocio <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                </div>
                <ul className="space-y-3">
                  {gains.map((g, i) => (
                    <motion.li
                      key={g}
                      initial={reduced ? false : { opacity: 0, x: 16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.12 }}
                      className="glass flex items-start gap-3 rounded-2xl p-4 text-[15.5px]"
                    >
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-electric" /> {g}
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
