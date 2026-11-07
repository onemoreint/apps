import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { faqs } from "../data/faq";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  // Datos estructurados FAQPage (se generan desde data/faq.ts).
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "faq-jsonld";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    });
    document.getElementById("faq-jsonld")?.remove();
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  return (
    <section id="faq" aria-labelledby="faq-title" className="relative py-20 sm:py-28">
      <div className="container-site grid gap-12 lg:grid-cols-[1fr_1.6fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            id="faq-title"
            align="left"
            eyebrow="Preguntas frecuentes"
            title={<>Resolvemos tus <span className="text-gradient">dudas.</span></>}
            intro="¿No encuentras tu pregunta? Escríbenos por WhatsApp y te respondemos personalmente."
          />
        </div>
        <Reveal>
          <ul className="space-y-3">
            {faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <li key={f.q} className={`overflow-hidden rounded-2xl ring-1 transition-colors ${isOpen ? "bg-white/[0.05] ring-white/15" : "bg-white/[0.02] ring-white/[0.07]"}`}>
                  <h3>
                    <button
                      type="button"
                      id={`faq-btn-${i}`}
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex min-h-[60px] w-full items-center justify-between gap-4 px-5 py-4 text-left font-display text-[16.5px] font-semibold sm:px-6 sm:text-[17.5px]"
                    >
                      {f.q}
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-all duration-300 ${isOpen ? "rotate-45 bg-electric text-ink" : "bg-white/[0.06] text-white"}`}>
                        <Plus className="h-4 w-4" />
                      </span>
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`faq-panel-${i}`}
                        role="region"
                        aria-labelledby={`faq-btn-${i}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <p className="px-5 pb-5 text-[15.5px] leading-relaxed text-mist sm:px-6">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
