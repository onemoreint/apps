import ParticleField from "./effects/ParticleField";
import JoinLink from "./ui/JoinLink";
import Reveal from "./ui/Reveal";

export default function FinalCTA() {
  return (
    <section className="band relative overflow-hidden bg-gradient-to-b from-deep to-[#101a44]">
      <ParticleField density={2.6} reach={150} strength={1.25} className="absolute inset-0 h-full w-full" />
      <div className="wrap relative text-center">
        <Reveal>
          <h2 className="h-display mx-auto max-w-[20ch] text-[clamp(2rem,5.6vw,4.25rem)]">El futuro de la educación también está en tus manos.</h2>
          <p className="body-lg mx-auto mt-6 !text-tech/90">Tu experiencia como docente es invaluable. Ahora puedes complementarla con herramientas que te permitan enseñar, crear y planificar de nuevas maneras.</p>
          <JoinLink location="cta-final" className="mt-9 w-full text-[1.05rem] sm:w-auto sm:px-10">Quiero ser parte del cambio</JoinLink>
          <p className="mx-auto mt-5 max-w-[52ch] text-sm leading-relaxed text-mute">Únete, participa en la definición de la fecha y prepárate para descubrir el potencial de la inteligencia artificial aplicada a la docencia.</p>
        </Reveal>
      </div>
    </section>
  );
}
