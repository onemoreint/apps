import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { processSteps } from "../data/process";
import { SectionHeading } from "../components/SectionHeading";

export function ProcessSection() {
  const ref = useRef<HTMLOListElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <section id="proceso" aria-labelledby="proceso-title" className="relative py-20 sm:py-28">
      <div className="container-site">
        <SectionHeading
          id="proceso-title"
          eyebrow="Proceso"
          title={<>De la idea a la publicación, <span className="text-gradient">paso a paso.</span></>}
          intro="Un método claro para que sepas qué sigue en cada momento y participes en las decisiones importantes."
        />

        <ol ref={ref} className="relative mx-auto mt-16 max-w-5xl">
          {/* Línea de tiempo */}
          <span aria-hidden className="absolute bottom-4 left-[23px] top-4 w-px bg-white/10 lg:left-1/2" />
          <motion.span
            aria-hidden
            style={{ scaleY: reduced ? 1 : fill }}
            className="absolute bottom-4 left-[23px] top-4 w-[2px] origin-top -translate-x-[0.5px] bg-gradient-to-b from-violet via-electric to-violet shadow-[0_0_14px_rgba(40,197,255,0.6)] lg:left-1/2"
          />

          {processSteps.map(({ title, text, icon: Icon }, i) => {
            const right = i % 2 === 1;
            return (
              <li key={title} className="relative pb-10 pl-16 last:pb-0 lg:grid lg:grid-cols-2 lg:gap-16 lg:pl-0">
                <motion.span
                  initial={reduced ? false : { scale: 0.4, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, margin: "-20% 0px" }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="absolute left-0 top-0 z-10 grid h-12 w-12 place-items-center rounded-2xl bg-ink-700 text-electric ring-1 ring-white/15 shadow-[0_0_0_6px_#080912] lg:left-1/2 lg:-translate-x-1/2"
                >
                  <Icon className="h-5 w-5" />
                </motion.span>
                <motion.div
                  initial={reduced ? false : { opacity: 0, x: right ? 30 : -30, y: 10 }}
                  whileInView={{ opacity: 1, x: 0, y: 0 }}
                  viewport={{ once: true, margin: "-15% 0px" }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className={`glass rounded-2xl p-5 transition-colors duration-300 hover:border-electric/30 sm:p-6 ${right ? "lg:col-start-2" : "lg:col-start-1 lg:text-right"}`}
                >
                  <span className="font-display text-[13px] font-bold tracking-[0.2em] text-electric-300">PASO {String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-1.5 text-[22px] font-bold">{title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-mist">{text}</p>
                </motion.div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
