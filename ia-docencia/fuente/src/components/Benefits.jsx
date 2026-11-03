import { benefits } from "../data/content";
import Reveal from "./ui/Reveal";

export default function Benefits() {
  return (
    <section className="band band-rule">
      <div className="wrap grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <Reveal>
          <h2 className="h-display h-section">Enseñar ha cambiado. Las herramientas también.</h2>
          <div className="body-lg mt-7 space-y-4">
            <p className="font-medium text-tech">Los docentes tienen una de las responsabilidades más importantes de la sociedad: formar personas.</p>
            <p>Pero planificar, diseñar actividades, elaborar materiales, adaptar contenidos y evaluar aprendizajes requiere tiempo, creatividad y dedicación.</p>
            <p>La inteligencia artificial puede convertirse en una aliada para simplificar estas tareas y potenciar el trabajo pedagógico.</p>
          </div>
        </Reveal>
        <div className="grid content-start gap-4 sm:grid-cols-2">
          {benefits.map((b, i) => (
            <Reveal key={b.title} delay={i * 0.07} className="glass group rounded-2xl p-6 transition-colors hover:border-neon/60">
              <b.icon className="h-7 w-7 text-neon transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110" aria-hidden="true" strokeWidth={1.7} />
              <h3 className="mt-4 font-display text-lg font-bold uppercase tracking-tight">{b.title}</h3>
              <p className="mt-2 text-[0.96rem] leading-relaxed text-mute">{b.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
