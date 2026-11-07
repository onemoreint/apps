import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Building2, Ruler, HardHat, ClipboardCheck, Leaf, ArrowRight, Mail, Phone, MapPin, CheckCircle2, Layers, Users, Target } from "lucide-react";
import { DemoShell } from "../../components/DemoShell";
import { WhatsAppIcon } from "../../components/WhatsAppIcon";
import { isValidPhone, waLink } from "../../services/whatsapp";

/** Demo de página corporativa para una firma de ingeniería FICTICIA («Vértice Ingeniería»). */

const NAVY = "#0f2a4a";
const ACCENT = "#1f7ae0";

const services = [
  { id: "diseno", icon: Ruler, title: "Diseño estructural", text: "Cálculo y diseño de estructuras para vivienda, comercio e industria, con memorias y planos de detalle.", points: ["Modelación y análisis", "Planos constructivos", "Revisión de diseños existentes"] },
  { id: "obra", icon: HardHat, title: "Gerencia de obra", text: "Planeación, control de presupuesto y cronograma, y coordinación de contratistas en sitio.", points: ["Programación de obra", "Control de costos", "Informes periódicos"] },
  { id: "interventoria", icon: ClipboardCheck, title: "Interventoría", text: "Seguimiento técnico, administrativo y de calidad para que la obra cumpla lo contratado.", points: ["Control de calidad", "Actas y bitácora", "Verificación de especificaciones"] },
  { id: "sostenible", icon: Leaf, title: "Construcción sostenible", text: "Alternativas para reducir consumo de energía y agua desde la etapa de diseño.", points: ["Análisis de alternativas", "Materiales eficientes", "Acompañamiento técnico"] },
];

const method = [
  { n: "01", t: "Diagnóstico", d: "Visitamos el sitio y entendemos los objetivos del proyecto." },
  { n: "02", t: "Propuesta técnica", d: "Definimos alcance, entregables y cronograma." },
  { n: "03", t: "Ejecución", d: "Desarrollamos el trabajo con reportes de avance." },
  { n: "04", t: "Entrega", d: "Entregamos documentación completa y acompañamiento." },
];

const areas = [
  { icon: Layers, t: "Área de diseño", d: "Ingenieros y dibujantes dedicados a cálculo y planos." },
  { icon: Target, t: "Área de proyectos", d: "Planeación, presupuestos y seguimiento de obra." },
  { icon: Users, t: "Área de atención", d: "Acompañamiento al cliente durante todo el proceso." },
];

export default function CorporateDemo() {
  const reduced = useReducedMotion();
  const [tab, setTab] = useState(services[0].id);
  const [form, setForm] = useState({ name: "", company: "", phone: "", msg: "" });
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const active = services.find((s) => s.id === tab)!;

  useEffect(() => {
    document.title = "Vértice Ingeniería · Demo página corporativa · NEXO DIGITAL STUDIO";
    return () => { document.title = "NEXO DIGITAL STUDIO · Landing pages, páginas web, menús QR e IA para negocios"; };
  }, []);

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setError("Escribe tu nombre.");
    if (!isValidPhone(form.phone)) return setError("Escribe un teléfono válido.");
    if (form.msg.trim().length < 10) return setError("Cuéntanos brevemente tu proyecto.");
    setError("");
    const link = waLink([
      "🏗️ *SOLICITUD · VÉRTICE INGENIERÍA*",
      "",
      `👤 *Contacto:* ${form.name.trim()}`,
      form.company.trim() ? `🏢 *Empresa:* ${form.company.trim()}` : null,
      `📱 *Teléfono:* ${form.phone.trim()}`,
      `🧩 *Servicio de interés:* ${active.title}`,
      "",
      `📝 ${form.msg.trim()}`,
      "",
      "_Solicitud de demostración generada con una página corporativa de NEXO DIGITAL STUDIO._",
    ].filter(Boolean).join("\n"));
    setSent(link);
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const up = (d = 0) => (reduced ? {} : { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.55, delay: d } });

  return (
    <DemoShell label="Página corporativa" quoteMessage="Hola, vi el demo de página corporativa y quiero una para mi empresa.">
      <div className="bg-white font-sans text-slate-800">
        {/* Navegación corporativa */}
        <nav className="sticky top-[57px] z-30 border-b border-slate-200 bg-white/95 backdrop-blur" aria-label="Demo corporativa">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
            <span className="flex items-center gap-2 font-display text-[17px] font-extrabold" style={{ color: NAVY }}>
              <span className="grid h-9 w-9 place-items-center rounded-lg text-white" style={{ background: NAVY }}><Building2 className="h-5 w-5" /></span>
              Vértice<span className="font-medium text-slate-500">Ingeniería</span>
            </span>
            <div className="no-scrollbar hidden gap-1 overflow-x-auto md:flex">
              {[["co-nosotros", "Nosotros"], ["co-servicios", "Servicios"], ["co-metodo", "Metodología"], ["co-contacto", "Contacto"]].map(([id, l]) => (
                <button key={id} type="button" onClick={() => go(id)} className="rounded-lg px-3 py-2 text-[14.5px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">{l}</button>
              ))}
            </div>
            <button type="button" onClick={() => go("co-contacto")} className="rounded-lg px-4 py-2.5 text-[14px] font-bold text-white" style={{ background: ACCENT }}>Cotizar</button>
          </div>
        </nav>

        {/* Hero */}
        <header className="relative overflow-hidden text-white" style={{ background: `linear-gradient(135deg, ${NAVY}, #12355f 60%, #174a85)` }}>
          <div aria-hidden className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="relative mx-auto max-w-6xl px-5 py-20 sm:py-28">
            <motion.p {...up()} className="text-[13px] font-bold uppercase tracking-[0.25em] text-sky-300">Ingeniería civil · Consultoría</motion.p>
            <motion.h1 {...up(0.05)} className="mt-4 max-w-3xl font-display text-[clamp(2.1rem,5.5vw,3.8rem)] font-bold leading-[1.08]">Diseñamos y acompañamos proyectos que se construyen con confianza.</motion.h1>
            <motion.p {...up(0.1)} className="mt-5 max-w-2xl text-[17px] text-white/80">Soluciones de ingeniería para constructoras, empresas y propietarios: del diseño a la entrega, con información clara en cada etapa.</motion.p>
            <motion.div {...up(0.15)} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => go("co-servicios")} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-lg bg-white px-6 font-bold" style={{ color: NAVY }}>Nuestros servicios <ArrowRight className="h-4 w-4" /></button>
              <button type="button" onClick={() => go("co-contacto")} className="inline-flex min-h-[52px] items-center justify-center rounded-lg border border-white/40 px-6 font-bold hover:bg-white/10">Solicitar reunión</button>
            </motion.div>
          </div>
        </header>

        {/* Nosotros */}
        <section id="co-nosotros" className="mx-auto grid max-w-6xl scroll-mt-32 gap-10 px-5 py-16 sm:py-20 lg:grid-cols-2">
          <motion.div {...up()}>
            <p className="text-[13px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Nosotros</p>
            <h2 className="mt-3 font-display text-[clamp(1.7rem,3.6vw,2.5rem)] font-bold" style={{ color: NAVY }}>Rigor técnico y comunicación directa</h2>
            <p className="mt-4 text-[16.5px] leading-relaxed text-slate-600">Somos una firma enfocada en resolver con criterio técnico los retos de cada obra. Trabajamos con procesos documentados para que nuestros clientes sepan siempre en qué punto está su proyecto.</p>
          </motion.div>
          <ul className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {areas.map(({ icon: Icon, t, d }, i) => (
              <motion.li key={t} {...up(i * 0.08)} className="flex gap-4 rounded-2xl border border-slate-200 p-5 sm:flex-col lg:flex-row">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-50" style={{ color: ACCENT }}><Icon className="h-5 w-5" /></span>
                <span><span className="block font-bold" style={{ color: NAVY }}>{t}</span><span className="block text-[15px] text-slate-600">{d}</span></span>
              </motion.li>
            ))}
          </ul>
        </section>

        {/* Servicios con pestañas */}
        <section id="co-servicios" className="scroll-mt-32 bg-slate-50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <p className="text-[13px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Servicios</p>
            <h2 className="mt-3 font-display text-[clamp(1.7rem,3.6vw,2.5rem)] font-bold" style={{ color: NAVY }}>Lo que hacemos</h2>
            <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
              <div role="tablist" aria-label="Servicios de Vértice" className="grid gap-2">
                {services.map((s) => {
                  const Icon = s.icon; const on = s.id === tab;
                  return (
                    <button key={s.id} role="tab" aria-selected={on} type="button" onClick={() => setTab(s.id)} className={`flex min-h-[60px] items-center gap-3 rounded-xl border px-4 text-left font-bold transition ${on ? "border-transparent text-white shadow-lg" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`} style={on ? { background: NAVY } : undefined}>
                      <Icon className="h-5 w-5 shrink-0" /> {s.title}
                    </button>
                  );
                })}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8" role="tabpanel">
                <AnimatePresence mode="wait">
                  <motion.div key={active.id} initial={reduced ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={reduced ? undefined : { opacity: 0, x: -12 }} transition={{ duration: 0.25 }}>
                    <active.icon className="h-9 w-9" style={{ color: ACCENT }} />
                    <h3 className="mt-4 font-display text-2xl font-bold" style={{ color: NAVY }}>{active.title}</h3>
                    <p className="mt-3 text-[16px] leading-relaxed text-slate-600">{active.text}</p>
                    <ul className="mt-5 space-y-2">
                      {active.points.map((p) => <li key={p} className="flex items-center gap-2 text-[15.5px]"><CheckCircle2 className="h-5 w-5" style={{ color: ACCENT }} /> {p}</li>)}
                    </ul>
                    <button type="button" onClick={() => go("co-contacto")} className="mt-6 inline-flex items-center gap-1.5 font-bold" style={{ color: ACCENT }}>Solicitar este servicio <ArrowRight className="h-4 w-4" /></button>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* Metodología */}
        <section id="co-metodo" className="mx-auto max-w-6xl scroll-mt-32 px-5 py-16 sm:py-20">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Metodología</p>
          <h2 className="mt-3 font-display text-[clamp(1.7rem,3.6vw,2.5rem)] font-bold" style={{ color: NAVY }}>Cómo trabajamos</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {method.map((m, i) => (
              <motion.li key={m.n} {...up(i * 0.07)} className="relative rounded-2xl border border-slate-200 p-6">
                <span className="font-display text-4xl font-extrabold text-slate-200">{m.n}</span>
                <h3 className="mt-2 text-lg font-bold" style={{ color: NAVY }}>{m.t}</h3>
                <p className="mt-1 text-[15px] text-slate-600">{m.d}</p>
              </motion.li>
            ))}
          </ol>
        </section>

        {/* Contacto */}
        <section id="co-contacto" className="scroll-mt-32 px-5 pb-16 sm:pb-20">
          <div className="mx-auto grid max-w-6xl gap-8 overflow-hidden rounded-3xl text-white lg:grid-cols-2" style={{ background: NAVY }}>
            <div className="p-7 sm:p-10">
              <h2 className="font-display text-[clamp(1.7rem,3.6vw,2.4rem)] font-bold">Hablemos de su proyecto</h2>
              <p className="mt-3 text-white/75">Cuéntenos qué necesita y le contactamos para agendar una reunión técnica.</p>
              <ul className="mt-6 space-y-3 text-[15px] text-white/85">
                <li className="flex items-center gap-3"><Phone className="h-5 w-5 text-sky-300" /> (Teléfono de ejemplo)</li>
                <li className="flex items-center gap-3"><Mail className="h-5 w-5 text-sky-300" /> contacto@ejemplo.com</li>
                <li className="flex items-center gap-3"><MapPin className="h-5 w-5 text-sky-300" /> Oficina principal (dirección de ejemplo)</li>
              </ul>
            </div>
            <div className="bg-white p-7 text-slate-800 sm:p-10">
              {sent ? (
                <div className="grid h-full place-items-center text-center" role="status">
                  <div>
                    <CheckCircle2 className="mx-auto h-12 w-12" style={{ color: ACCENT }} />
                    <p className="mt-3 font-display text-2xl font-bold" style={{ color: NAVY }}>Solicitud enviada</p>
                    <a href={sent} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-[#25D366] px-5 font-bold text-[#04210f]"><WhatsAppIcon /> Abrir WhatsApp</a>
                    <button type="button" onClick={() => setSent("")} className="mt-3 block w-full text-sm font-semibold text-slate-500 hover:text-slate-800">Nueva solicitud</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit} noValidate className="space-y-4">
                  {([["name", "Nombre", "name", "text"], ["company", "Empresa (opcional)", "organization", "text"], ["phone", "Teléfono", "tel", "tel"]] as const).map(([k, l, ac, t]) => (
                    <div key={k}>
                      <label htmlFor={`cd-${k}`} className="mb-1.5 block text-sm font-bold text-slate-700">{l}</label>
                      <input id={`cd-${k}`} type={t} autoComplete={ac} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="h-12 w-full rounded-lg border border-slate-300 px-4 text-[16px] outline-none focus:border-[#1f7ae0] focus:ring-2 focus:ring-[#1f7ae0]/20" />
                    </div>
                  ))}
                  <div>
                    <label htmlFor="cd-msg" className="mb-1.5 block text-sm font-bold text-slate-700">Proyecto</label>
                    <textarea id="cd-msg" rows={3} value={form.msg} onChange={(e) => setForm({ ...form, msg: e.target.value })} className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-[16px] outline-none focus:border-[#1f7ae0] focus:ring-2 focus:ring-[#1f7ae0]/20" placeholder={`Servicio seleccionado: ${active.title}`} />
                  </div>
                  {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
                  <button type="submit" className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg font-bold text-white" style={{ background: ACCENT }}>Enviar solicitud <ArrowRight className="h-4 w-4" /></button>
                </form>
              )}
            </div>
          </div>
        </section>
        <footer className="border-t border-slate-200 py-6 text-center text-[13px] text-slate-500">Vértice Ingeniería es una empresa ficticia · Demo creada por NEXO DIGITAL STUDIO</footer>
      </div>
    </DemoShell>
  );
}
