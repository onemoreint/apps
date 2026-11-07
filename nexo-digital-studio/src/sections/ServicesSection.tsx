import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ArrowUpRight, Sparkles } from "lucide-react";
import { services } from "../data/services";
import { SectionHeading } from "../components/SectionHeading";
import { ServiceMockup } from "../components/ServiceMockup";
import { TiltCard } from "../components/TiltCard";
import { WhatsAppIcon } from "../components/WhatsAppIcon";
import { Button } from "../components/Button";
import { waLink } from "../services/whatsapp";
import { Reveal } from "../components/Reveal";

export function ServicesSection() {
  const [activeId, setActiveId] = useState(services[0].id);
  const reduced = useReducedMotion();
  const active = services.find((s) => s.id === activeId) ?? services[0];

  return (
    <section id="servicios" aria-labelledby="servicios-title" className="relative overflow-x-clip py-20 sm:py-28">
      <div aria-hidden className="absolute left-1/2 top-40 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-violet/10 blur-[140px]" />
      <div className="container-site">
        <SectionHeading
          id="servicios-title"
          eyebrow="Servicios"
          title={<>Soluciones digitales <span className="text-gradient">que trabajan por tu negocio</span></>}
          intro="Elige un módulo para ver qué incluye. Cada solución se diseña para tu marca y se conecta con WhatsApp para que ningún cliente se quede sin respuesta."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Selector de módulos */}
          <Reveal>
            <div role="tablist" aria-label="Servicios" className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
              {services.map((s) => {
                const Icon = s.icon;
                const selected = s.id === activeId;
                return (
                  <button
                    key={s.id}
                    role="tab"
                    id={`tab-${s.id}`}
                    aria-selected={selected}
                    aria-controls={`panel-${s.id}`}
                    onClick={() => setActiveId(s.id)}
                    className={`group relative min-w-[230px] shrink-0 overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 sm:p-5 lg:min-w-0 ${selected ? "bg-white/[0.06] ring-1 ring-white/15" : "ring-1 ring-white/[0.06] hover:bg-white/[0.03]"}`}
                  >
                    {selected && (
                      <motion.span layoutId="svc-active" aria-hidden className="absolute inset-y-3 left-0 w-[3px] rounded-full bg-gradient-to-b from-violet to-electric" />
                    )}
                    <div className="flex items-center gap-4">
                      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl transition-all duration-300 ${selected ? "bg-gradient-to-br from-violet to-electric text-white shadow-[0_8px_24px_-6px_rgba(120,87,255,0.8)]" : "bg-white/[0.05] text-mist group-hover:text-white"}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-mist-700">{s.letter} · {s.kicker}</span>
                        <span className={`mt-0.5 block font-display text-[18px] font-semibold ${selected ? "text-white" : "text-mist-300"}`}>{s.title}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Reveal>

          {/* Panel del servicio */}
          <Reveal delay={0.1}>
            <TiltCard max={4} className="rounded-[28px]">
              <div className="glass-strong relative overflow-hidden rounded-[28px] p-5 sm:p-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active.id}
                    role="tabpanel"
                    id={`panel-${active.id}`}
                    aria-labelledby={`tab-${active.id}`}
                    initial={reduced ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="grid gap-7 md:grid-cols-2"
                  >
                    <div className="order-2 md:order-1">
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-electric-300">
                        <Sparkles className="h-3.5 w-3.5" /> {active.kicker}
                      </span>
                      <h3 className="mt-3 text-[28px] font-bold leading-tight sm:text-[32px]">{active.title}</h3>
                      <p className="mt-3 text-[15.5px] leading-relaxed text-mist">{active.description}</p>

                      <h4 className="mt-6 text-[12px] font-bold uppercase tracking-[0.18em] text-white/70">Beneficios</h4>
                      <ul className="mt-3 space-y-2.5">
                        {active.benefits.map((b) => (
                          <li key={b} className="flex gap-2.5 text-[15px] text-white/90">
                            <Check className="mt-1 h-4 w-4 shrink-0 text-electric" /> {b}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="order-1 flex flex-col gap-4 md:order-2">
                      <div className="h-[230px] sm:h-[250px]"><ServiceMockup kind={active.mockup} /></div>
                      <div>
                        <h4 className="text-[12px] font-bold uppercase tracking-[0.18em] text-white/70">Características</h4>
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {active.features.map((f) => (
                            <li key={f} className="rounded-full bg-white/[0.05] px-3 py-1.5 text-[13px] text-mist-300 ring-1 ring-white/[0.08]">{f}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="order-3 flex flex-col gap-3 sm:flex-row md:col-span-2">
                      <Button variant="whatsapp" href={waLink(active.waMessage)} external className="w-full sm:w-auto">
                        <WhatsAppIcon /> Cotizar {active.title}
                      </Button>
                      <Button variant="secondary" href="#showroom" className="w-full sm:w-auto">
                        Ver demos <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </TiltCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
