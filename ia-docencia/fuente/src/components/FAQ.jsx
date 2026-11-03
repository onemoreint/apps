import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Plus } from "lucide-react";
import { faqs } from "../data/content";
import Reveal from "./ui/Reveal";

export default function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section id="preguntas" className="band band-rule">
      <div className="wrap grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <Reveal><h2 className="h-display h-section">Preguntas frecuentes</h2></Reveal>
        <div className="min-w-0 divide-y divide-white/10 border-y border-white/10">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q}>
                <h3>
                  <button
                    type="button"
                    id={`faq-b${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-p${i}`}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left font-display text-[1.07rem] font-medium leading-snug transition-colors hover:text-neon sm:text-lg"
                  >
                    {f.q}
                    <Plus className={`h-5 w-5 shrink-0 text-neon transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`} aria-hidden="true" />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <m.div
                      id={`faq-p${i}`}
                      role="region"
                      aria-labelledby={`faq-b${i}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-[62ch] pb-5 leading-relaxed text-mute">{f.a}</p>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
