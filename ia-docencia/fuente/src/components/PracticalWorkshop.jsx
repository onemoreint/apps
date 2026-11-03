import { products } from "../data/content";
import Reveal from "./ui/Reveal";

const paper = "absolute inset-x-5 top-5 bottom-0 rounded-t-xl border border-white/20 shadow-[0_18px_50px_-18px_rgba(0,200,255,.55)] transition-transform duration-300 group-hover:-translate-y-1.5";

function PlanMock() {
  const rows = [
    ["Inicio", "Conversación con imágenes sobre el tema."],
    ["Desarrollo", "Trabajo en estaciones con apoyos visuales."],
    ["Cierre", "Cada estudiante comparte lo que hizo."],
  ];
  return (
    <div className={`${paper} bg-tech p-4 text-ink`}>
      <p className="font-display text-sm font-bold">Planificación</p>
      <p className="mt-0.5 text-[0.7rem] text-[#44506f]">Objetivo: reconocer emociones básicas</p>
      <div className="mt-3 space-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="rounded-md bg-[#E4EBFF] px-2.5 py-1.5">
            <p className="text-[0.7rem] font-semibold text-electric">{k}</p>
            <p className="text-[0.72rem] leading-snug">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FichaMock() {
  const items = ["🙂", "😢", "😠", "😮"];
  return (
    <div className={`${paper} bg-gradient-to-b from-[#F5F7FF] to-[#E4DCFF] p-4 text-ink`}>
      <p className="font-display text-sm font-bold">Ficha: ¿cómo me siento hoy?</p>
      <p className="mt-0.5 text-[0.7rem] text-[#44506f]">Señala o marca la imagen</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {items.map((e) => (
          <div key={e} className="grid h-[3.9rem] place-items-center rounded-lg border-2 border-violet/50 bg-white text-[1.7rem]" aria-hidden="true">{e}</div>
        ))}
      </div>
    </div>
  );
}

function PromptMock() {
  return (
    <div className={`${paper} bg-deep p-3.5 text-tech`}>
      <div className="ml-6 rounded-xl rounded-br-sm bg-electric px-3 py-2 text-[0.73rem] leading-snug text-white">
        Adapta esta actividad para un estudiante que se comunica con pictogramas.
      </div>
      <div className="mt-2.5 mr-6 rounded-xl rounded-bl-sm border border-white/15 bg-navy px-3 py-2 text-[0.73rem] leading-snug">
        Aquí tienes una versión en tres pasos, con apoyos visuales para cada uno.
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[0.68rem] text-neon">
        <span className="rounded-full border border-neon/50 px-2 py-0.5">Planificar</span>
        <span className="rounded-full border border-neon/50 px-2 py-0.5">Adaptar</span>
        <span className="rounded-full border border-neon/50 px-2 py-0.5">Evaluar</span>
      </div>
      <div className="mt-3 space-y-1.5 text-[0.7rem] leading-snug text-mute">
        <p className="rounded-md border border-white/10 px-2.5 py-1.5">Crea una ficha con imágenes sobre…</p>
        <p className="rounded-md border border-white/10 px-2.5 py-1.5">Resume este informe en lenguaje sencillo…</p>
      </div>
    </div>
  );
}

const mocks = { plan: PlanMock, ficha: FichaMock, prompts: PromptMock };

export default function PracticalWorkshop() {
  return (
    <section className="band band-rule">
      <div className="wrap">
        <Reveal><h2 className="h-display h-section !max-w-[22ch]">No vas a venir solamente a escuchar. Vas a crear.</h2></Reveal>
        <p className="body-lg mt-5">Tres productos que aprenderás a elaborar durante la formación.</p>
        <div className="mt-11 grid gap-5 md:grid-cols-3">
          {products.map((p, i) => {
            const Mock = mocks[p.kind];
            return (
              <Reveal key={p.kind} delay={i * 0.08} className="h-full">
                <article className="glass group flex h-full flex-col overflow-hidden rounded-2xl">
                  <div className="relative h-[17.5rem] overflow-hidden bg-gradient-to-br from-electric/25 via-transparent to-violet/25" aria-hidden="true">
                    <Mock />
                  </div>
                  <div className="p-5 sm:p-6">
                    <h3 className="font-display text-lg font-bold leading-snug">{p.title}</h3>
                    <p className="mt-1.5 text-[0.96rem] leading-relaxed text-mute">{p.text}</p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
        <p className="mt-4 text-[0.8rem] text-mute/90">Las imágenes son ejemplos ilustrativos.</p>
      </div>
    </section>
  );
}
