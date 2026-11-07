import { Bot, Plus, Send, Workflow, MousePointerClick } from "lucide-react";
import type { MockupKind } from "../data/services";

/** Mockups ilustrativos (HTML/CSS, sin imágenes pesadas) para cada servicio. */
export function ServiceMockup({ kind }: { kind: MockupKind }) {
  return <div aria-hidden="true" className="h-full">{renderMockup(kind)}</div>;
}

function renderMockup(kind: MockupKind) {
  switch (kind) {
    case "landing":
      return (
        <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-[#0f1222] p-5">
          <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-violet/40 blur-3xl" />
          <span className="relative inline-block rounded-full bg-electric/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-electric-300">Oferta de lanzamiento</span>
          <div className="relative mt-3 space-y-2">
            <span className="block h-5 w-4/5 rounded bg-gradient-to-r from-white to-violet-300" />
            <span className="block h-5 w-3/5 rounded bg-gradient-to-r from-violet-300 to-electric" />
            <span className="mt-3 block h-2 w-full rounded bg-white/15" />
            <span className="block h-2 w-5/6 rounded bg-white/15" />
          </div>
          <div className="relative mt-5 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet to-electric px-3.5 py-2 text-[11px] font-bold">
              Quiero mi cupo <MousePointerClick className="h-3.5 w-3.5" />
            </span>
            <span className="text-[10px] text-mist">Respuesta inmediata</span>
          </div>
          <div className="relative mt-5 grid grid-cols-3 gap-2">
            {["Beneficio", "Garantía", "Contacto"].map((b) => (
              <div key={b} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5">
                <span className="block h-5 w-5 rounded-md bg-gradient-to-br from-violet to-electric" />
                <span className="mt-2 block text-[10px] font-semibold text-white/80">{b}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "web":
      return (
        <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-[#0f1222]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <span className="h-3 w-14 rounded bg-white/80" />
            <div className="flex gap-2">{["Inicio", "Nosotros", "Servicios", "Contacto"].map((n) => <span key={n} className="text-[9.5px] text-mist">{n}</span>)}</div>
          </div>
          <div className="grid grid-cols-[1.2fr_1fr] gap-3 p-4">
            <div className="space-y-2">
              <span className="block h-4 w-11/12 rounded bg-white/85" />
              <span className="block h-4 w-3/4 rounded bg-white/85" />
              <span className="block h-2 w-full rounded bg-white/15" />
              <span className="block h-2 w-4/5 rounded bg-white/15" />
              <span className="mt-2 inline-block h-6 w-24 rounded-full bg-electric/80" />
            </div>
            <div className="rounded-xl bg-[linear-gradient(135deg,rgba(120,87,255,0.6),rgba(40,197,255,0.5))]" />
          </div>
          <div className="grid grid-cols-4 gap-2 px-4 pb-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2">
                <span className="block h-8 rounded bg-white/[0.06]" />
                <span className="mt-1.5 block h-1.5 w-3/4 rounded bg-white/20" />
              </div>
            ))}
          </div>
        </div>
      );
    case "menu":
      return (
        <div className="relative grid h-full place-items-center overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_70%_20%,rgba(40,197,255,0.25),transparent_55%),#0f1222] p-5">
          <div className="w-[190px] rounded-[26px] border border-white/15 bg-[#0b0d18] p-[5px] shadow-2xl">
            <div className="rounded-[21px] bg-[#111427] p-3">
              <p className="text-[10px] font-bold text-white">Fogón Urbano</p>
              <div className="mt-2 flex gap-1">{["🍔", "🍕", "🥗", "🥤"].map((e, i) => <span key={e} className={`grid h-7 w-7 place-items-center rounded-lg text-sm ${i === 0 ? "bg-electric/25 ring-1 ring-electric" : "bg-white/[0.06]"}`}>{e}</span>)}</div>
              <div className="mt-2.5 space-y-1.5">
                {[["Clásica", "$22.000"], ["Doble Ahumada", "$29.000"]].map(([n, p]) => (
                  <div key={n} className="flex items-center gap-2 rounded-xl bg-white/[0.05] p-1.5">
                    <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400/70 to-orange-600/70" />
                    <span className="flex-1"><span className="block text-[9px] font-bold">{n}</span><span className="block text-[8px] text-mist">{p}</span></span>
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-violet"><Plus className="h-3 w-3" /></span>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 rounded-xl bg-[#25D366] px-2 py-2 text-center text-[9px] font-bold text-[#04210f]">Enviar pedido · $51.000</div>
            </div>
          </div>
          <div className="glass absolute right-3 top-3 rounded-xl p-2">
            <div className="grid grid-cols-5 gap-[2px]">
              {Array.from({ length: 25 }).map((_, i) => <span key={i} className={`h-2 w-2 rounded-[1px] ${[0, 1, 2, 5, 7, 10, 11, 12, 4, 9, 14, 20, 21, 22, 15, 17, 24, 18, 13].includes(i) ? "bg-white" : "bg-transparent"}`} />)}
            </div>
          </div>
        </div>
      );
    case "ai":
      return (
        <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-[#0f1222] p-4">
          <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-electric/25 blur-3xl" />
          <div className="relative flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet to-electric"><Bot className="h-4 w-4" /></span>
            <span className="text-[12px] font-bold">Asistente del negocio</span>
          </div>
          <div className="relative mt-3 space-y-2 text-[11px]">
            <p className="ml-auto w-fit rounded-2xl rounded-br-sm bg-violet/80 px-3 py-2">¿Tienen envío a domicilio?</p>
            <p className="w-fit max-w-[90%] rounded-2xl rounded-bl-sm bg-white/[0.07] px-3 py-2 text-white/90">¡Sí! Te comparto el catálogo y tomo tu pedido aquí mismo.</p>
          </div>
          <div className="relative mt-4 grid grid-cols-3 items-center gap-1 text-center text-[9.5px] text-mist">
            {["Formulario", "Automatización", "WhatsApp"].map((s, i) => (
              <div key={s} className="flex items-center justify-center gap-1">
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-white/85">{s}</span>
                {i < 2 && <Workflow className="h-3 w-3 text-electric" />}
              </div>
            ))}
          </div>
          <div className="relative mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <span className="flex-1 text-[10.5px] text-mist-700">Escribe tu pregunta…</span>
            <Send className="h-3.5 w-3.5 text-electric" />
          </div>
        </div>
      );
  }
}
