import { steps } from "../data/content";
import Reveal from "./ui/Reveal";
import JoinLink from "./ui/JoinLink";
import PrequalForm from "./PrequalForm";

export default function WhatsAppFunnel() {
  return (
    <section id="participar" className="band band-rule overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/4 top-1/3 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(37,211,102,.14),transparent)]" />
      <div className="wrap relative grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="min-w-0">
          <Reveal>
            <h2 className="h-display h-section">¡Forma parte de esta experiencia!</h2>
            <div className="body-lg mt-6 space-y-3">
              <p>Estamos organizando un grupo de docentes interesados en incorporar la inteligencia artificial a sus prácticas educativas.</p>
              <p>La fecha de realización se definirá tomando en cuenta la disponibilidad de los participantes.</p>
            </div>
          </Reveal>
          <h3 className="mt-9 font-display text-xl font-bold">¿Cómo participar?</h3>
          <ol className="relative mt-5 space-y-5">
            <svg aria-hidden="true" className="absolute left-[21px] top-6 h-[calc(100%-3rem)] w-0.5 overflow-visible" preserveAspectRatio="none">
              <line x1="1" y1="0" x2="1" y2="100%" className="circuit-flow" stroke="#25D366" strokeWidth="2" />
            </svg>
            {steps.map((s, i) => (
              <Reveal as="li" key={s.n} delay={i * 0.08} className="relative flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-wa bg-ink font-display text-lg font-bold text-wa shadow-[0_0_20px_-4px_#25D366]" aria-hidden="true">{s.n}</span>
                <p className="min-w-0 pt-1 leading-snug"><span className="block font-display font-bold">Paso {s.n}</span><span className="text-mute">{s.text}</span></p>
              </Reveal>
            ))}
          </ol>
          <JoinLink location="embudo" variant="wa" className="mt-9 w-full !min-h-[4.25rem] text-[1.08rem] sm:text-xl lg:w-auto lg:px-10">Unirme al grupo de WhatsApp</JoinLink>
        </div>
        <div className="min-w-0 lg:pt-3">
          <PrequalForm />
        </div>
      </div>
    </section>
  );
}
