import { ArrowUpRight, Check, MousePointerClick } from "lucide-react";
import { showroom } from "../data/showroom";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";
import { TiltCard } from "../components/TiltCard";
import { ServiceMockup } from "../components/ServiceMockup";
import { routeHref } from "../hooks/useHashRoute";
import type { MockupKind } from "../data/services";

const previewKind: Record<string, MockupKind> = { landing: "landing", menu: "menu", corporativa: "web" };

export function ShowroomSection() {
  return (
    <section id="showroom" aria-labelledby="showroom-title" className="relative py-20 sm:py-28">
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-40 mask-fade-b" />
      <div className="container-site">
        <SectionHeading
          id="showroom-title"
          eyebrow="Showroom digital"
          title={<>Explora lo que podemos <span className="text-gradient">crear para ti.</span></>}
          intro="Tres proyectos demostrativos que funcionan de verdad en tu navegador. Los negocios y productos son ficticios: pruébalos como lo haría uno de tus clientes."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {showroom.map((item, i) => {
            const Icon = item.icon;
            const featured = item.id === "menu";
            return (
              <Reveal key={item.id} delay={i * 0.1} className={featured ? "lg:-mt-6" : ""}>
                <TiltCard className="h-full rounded-[28px]">
                  <a
                    href={routeHref.demo(item.id)}
                    className={`group relative flex h-full flex-col overflow-hidden rounded-[28px] p-[1px] transition-transform duration-500 hover:-translate-y-1`}
                    aria-label={`Abrir ${item.label}: ${item.title}`}
                  >
                    <span aria-hidden className={`absolute inset-0 rounded-[28px] bg-gradient-to-br ${item.accent} opacity-25 transition-opacity duration-500 group-hover:opacity-80`} />
                    <div className="relative flex h-full flex-col rounded-[27px] bg-[linear-gradient(170deg,#141729,#0a0c17)] p-5 sm:p-6">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold uppercase tracking-[0.22em] text-mist-700">{item.label}</span>
                        {featured && <span className="rounded-full bg-electric/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-electric-300 ring-1 ring-electric/30">Interactiva</span>}
                      </div>
                      <div className="relative mt-4 h-[230px] overflow-hidden rounded-2xl">
                        <div className="h-full transition-transform duration-700 group-hover:scale-[1.04]"><ServiceMockup kind={previewKind[item.id]} /></div>
                        <span className="absolute inset-0 grid place-items-center bg-ink/60 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
                          <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-bold uppercase tracking-wider text-ink">
                            <MousePointerClick className="h-4 w-4" /> Probar demo
                          </span>
                        </span>
                      </div>
                      <div className="mt-5 flex items-center gap-3">
                        <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${item.accent}`}><Icon className="h-5 w-5" /></span>
                        <h3 className="text-[22px] font-bold">{item.title}</h3>
                      </div>
                      <p className="mt-3 flex-1 text-[15px] leading-relaxed text-mist">{item.description}</p>
                      <ul className="mt-4 space-y-1.5">
                        {item.highlights.map((h) => (
                          <li key={h} className="flex items-center gap-2 text-[14px] text-white/85"><Check className="h-4 w-4 text-electric" /> {h}</li>
                        ))}
                      </ul>
                      <span className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-bold uppercase tracking-[0.1em] text-white">
                        Abrir demo <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </a>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
