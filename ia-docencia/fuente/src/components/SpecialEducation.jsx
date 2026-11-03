import { specialAreas } from "../data/content";
import Reveal from "./ui/Reveal";
import JoinLink from "./ui/JoinLink";
import ClassroomIllustration from "./effects/ClassroomIllustration";

export default function SpecialEducation() {
  return (
    <section className="band band-rule bg-gradient-to-b from-violet/10 to-transparent">
      <div className="wrap grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <Reveal className="order-2 lg:order-1">
          <figure className="glass rounded-3xl p-4 sm:p-7">
            <ClassroomIllustration />
            <figcaption className="mt-3 text-sm leading-snug text-mute">El vínculo con cada estudiante sigue en manos de la docente. La IA ayuda a preparar el material.</figcaption>
          </figure>
        </Reveal>
        <Reveal className="order-1 lg:order-2">
          <p className="font-medium text-neon">Especialmente pensado para docentes de Educación Especial</p>
          <h2 className="h-display h-section mt-4">La tecnología debe estar al servicio de las personas.</h2>
          <p className="body-lg mt-6">La experiencia y sensibilidad del docente son insustituibles. La inteligencia artificial no viene a reemplazar al educador, sino a ofrecer nuevas herramientas para fortalecer su labor.</p>
          <ul className="mt-7 divide-y divide-white/10 border-y border-white/10">
            {specialAreas.map((a) => (
              <li key={a.text} className="flex items-center gap-4 py-3.5">
                <a.icon className="h-6 w-6 shrink-0 text-neon" aria-hidden="true" strokeWidth={1.7} />
                <span className="font-medium leading-snug">{a.text}</span>
              </li>
            ))}
          </ul>
          <JoinLink location="educacion-especial" className="mt-8 w-full sm:w-auto">Quiero participar</JoinLink>
        </Reveal>
      </div>
    </section>
  );
}
