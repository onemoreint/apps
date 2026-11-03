import { tools } from "../data/content";
import Reveal from "./ui/Reveal";

function onMove(e) {
  if (e.pointerType !== "mouse") return;
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 9}deg`);
  e.currentTarget.style.setProperty("--rx", `${((e.clientY - r.top) / r.height - 0.5) * -9}deg`);
}
function onLeave(e) {
  e.currentTarget.style.setProperty("--ry", "0deg");
  e.currentTarget.style.setProperty("--rx", "0deg");
}

export default function Tools() {
  return (
    <section id="herramientas" className="band band-rule">
      <div className="wrap">
        <Reveal><h2 className="h-display h-section">Herramientas que vamos a utilizar</h2></Reveal>
        <div className="mt-11 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.06} className="h-full">
              <article onPointerMove={onMove} onPointerLeave={onLeave} className="tilt glass flex h-full flex-col rounded-2xl p-6">
                <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-ink">
                  <img src={t.logo} alt={`Logo de ${t.name}`} width="40" height="40" className="h-10 w-10" loading="lazy" />
                </div>
                <h3 className="mt-5 font-display text-xl font-bold">{t.name}</h3>
                <p className="mt-2 text-[0.96rem] leading-relaxed text-mute">{t.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
        <p className="mt-5 text-[0.8rem] leading-snug text-mute/90">Los nombres y logos pertenecen a sus respectivos titulares y se muestran solo para identificar las herramientas que se usan en el curso.</p>
      </div>
    </section>
  );
}
