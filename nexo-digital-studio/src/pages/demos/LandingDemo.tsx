import { useEffect, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Zap, HeartPulse, Users, CalendarCheck, Check, ArrowRight, Timer, Dumbbell, Flame, CheckCircle2 } from "lucide-react";
import { DemoShell } from "../../components/DemoShell";
import { WhatsAppIcon } from "../../components/WhatsAppIcon";
import { isValidPhone, waLink } from "../../services/whatsapp";

/** Demo de landing page de captación para un estudio de entrenamiento FICTICIO («PULSO Studio»). */

const LIME = "#c6ff3d";

const benefits = [
  { icon: Zap, title: "Sesiones de 45 minutos", text: "Entrenamientos intensos y guiados que caben en tu agenda." },
  { icon: Users, title: "Grupos reducidos", text: "Atención cercana del coach en cada ejercicio." },
  { icon: HeartPulse, title: "Para todos los niveles", text: "Ajustamos la intensidad según tu condición física." },
  { icon: CalendarCheck, title: "Reserva en segundos", text: "Elige tu horario y confirma por WhatsApp." },
];

const classes = [
  { icon: Flame, name: "Funcional", desc: "Fuerza, resistencia y movilidad en circuito." },
  { icon: Timer, name: "HIIT", desc: "Intervalos de alta intensidad para quemar energía." },
  { icon: Dumbbell, name: "Fuerza", desc: "Técnica y progresión con pesas libres." },
];

const schedule = ["6:00 a. m.", "7:00 a. m.", "12:30 p. m.", "6:00 p. m.", "7:00 p. m."];

export default function LandingDemo() {
  const reduced = useReducedMotion();
  const [form, setForm] = useState({ name: "", phone: "", cls: "Funcional", time: schedule[0] });
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    document.title = "PULSO Studio · Demo landing page · NEXO DIGITAL STUDIO";
    return () => { document.title = "NEXO DIGITAL STUDIO · Landing pages, páginas web, menús QR e IA para negocios"; };
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setError("Escribe tu nombre.");
    if (!isValidPhone(form.phone)) return setError("Escribe un WhatsApp válido.");
    setError("");
    const msg = [
      "💪 *RESERVA CLASE DE PRUEBA · PULSO STUDIO*",
      "",
      `👤 *Nombre:* ${form.name.trim()}`,
      `📱 *WhatsApp:* ${form.phone.trim()}`,
      `🏋️ *Clase:* ${form.cls}`,
      `⏰ *Horario:* ${form.time}`,
      "",
      "_Reserva de demostración generada con una landing de NEXO DIGITAL STUDIO._",
    ].join("\n");
    const link = waLink(msg);
    setDone(link);
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const fade = (delay = 0) => (reduced ? {} : { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.6, delay } });

  return (
    <DemoShell label="Landing page" quoteMessage="Hola, vi el demo de landing page y quiero una para mi negocio.">
      <div className="bg-[#0b0b0b] font-sans text-white">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full opacity-30 blur-[110px]" style={{ background: LIME }} />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:py-24 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.2em] text-black" style={{ background: LIME }}>
                <Zap className="h-3.5 w-3.5" /> Primera clase sin costo
              </span>
              <motion.h1 {...fade()} className="mt-6 font-display text-[clamp(2.4rem,7vw,4.6rem)] font-extrabold uppercase leading-[0.95] tracking-tight">
                Entrena con <span style={{ color: LIME }}>propósito.</span><br />Siente el pulso.
              </motion.h1>
              <motion.p {...fade(0.1)} className="mt-5 max-w-lg text-[17px] leading-relaxed text-white/70">
                Clases guiadas en grupos reducidos para que avances con técnica y constancia. Reserva tu clase de prueba y conoce el estudio.
              </motion.p>
              <motion.div {...fade(0.2)} className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="#reserva-demo" className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full px-7 text-[15px] font-extrabold uppercase tracking-wide text-black transition hover:brightness-110" style={{ background: LIME }}>
                  Reservar mi clase <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#clases-demo" className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-white/20 px-7 text-[15px] font-bold uppercase tracking-wide hover:bg-white/5">
                  Ver clases
                </a>
              </motion.div>
            </div>
            <motion.div {...fade(0.15)} className="relative mx-auto aspect-square w-full max-w-[440px]">
              <div className="absolute inset-0 rounded-[40px] border border-white/10 bg-[linear-gradient(160deg,#1a1a1a,#0b0b0b)]" />
              <div className="absolute inset-6 grid place-items-center rounded-[32px] bg-[radial-gradient(circle_at_50%_40%,rgba(198,255,61,0.35),transparent_60%)]">
                <svg viewBox="0 0 200 120" className="w-4/5" aria-hidden>
                  <motion.path
                    d="M0 60 H55 L68 30 L82 95 L96 15 L110 80 L122 60 H200"
                    fill="none" stroke={LIME} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                    initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.8, repeat: reduced ? 0 : Infinity, repeatDelay: 0.6, ease: "easeInOut" }}
                  />
                </svg>
              </div>
              <div className="absolute bottom-6 left-6 rounded-2xl bg-black/70 px-4 py-3 backdrop-blur">
                <p className="text-[11px] uppercase tracking-widest text-white/60">Próxima clase</p>
                <p className="font-display text-lg font-bold">Funcional · 6:00 p. m.</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* BENEFICIOS */}
        <section className="border-y border-white/10 bg-[#111]">
          <ul className="mx-auto grid max-w-6xl gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map(({ icon: Icon, title, text }, i) => (
              <motion.li key={title} {...fade(i * 0.06)} className="bg-[#111] p-6">
                <Icon className="h-6 w-6" style={{ color: LIME }} />
                <h2 className="mt-3 font-display text-lg font-bold">{title}</h2>
                <p className="mt-1 text-[15px] text-white/65">{text}</p>
              </motion.li>
            ))}
          </ul>
        </section>

        {/* CLASES */}
        <section id="clases-demo" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:py-20">
          <h2 className="font-display text-[clamp(1.8rem,4vw,2.8rem)] font-extrabold uppercase">Elige tu entrenamiento</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {classes.map(({ icon: Icon, name, desc }, i) => (
              <motion.button
                key={name}
                type="button"
                {...fade(i * 0.08)}
                onClick={() => { setForm((f) => ({ ...f, cls: name })); document.getElementById("reserva-demo")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" }); }}
                className={`group rounded-3xl border p-6 text-left transition hover:-translate-y-1 ${form.cls === name ? "border-[#c6ff3d] bg-[#c6ff3d]/[0.07]" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.06]"><Icon className="h-6 w-6" style={{ color: LIME }} /></span>
                <h3 className="mt-4 font-display text-2xl font-bold">{name}</h3>
                <p className="mt-1 text-[15px] text-white/65">{desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold uppercase tracking-wider" style={{ color: LIME }}>Reservar esta <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* RESERVA */}
        <section id="reserva-demo" className="scroll-mt-20 px-5 pb-20">
          <div className="mx-auto grid max-w-6xl gap-8 rounded-[32px] border border-white/10 bg-[linear-gradient(140deg,#151515,#0b0b0b)] p-6 sm:p-10 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold uppercase leading-tight">Reserva tu clase de prueba</h2>
              <ul className="mt-6 space-y-3 text-[15.5px] text-white/80">
                {["Sin compromiso de permanencia", "Te acompañamos desde el primer ejercicio", "Confirmación inmediata por WhatsApp"].map((t) => (
                  <li key={t} className="flex gap-2.5"><Check className="mt-0.5 h-5 w-5 shrink-0" style={{ color: LIME }} /> {t}</li>
                ))}
              </ul>
            </div>
            {done ? (
              <div className="grid place-items-center rounded-3xl bg-white/[0.04] p-8 text-center" role="status">
                <CheckCircle2 className="h-12 w-12" style={{ color: LIME }} />
                <p className="mt-3 font-display text-2xl font-bold">¡Reserva enviada!</p>
                <p className="mt-2 text-white/65">Abrimos WhatsApp con tu solicitud.</p>
                <a href={done} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[#25D366] px-5 font-bold text-[#04210f]"><WhatsAppIcon /> Abrir WhatsApp</a>
                <button type="button" onClick={() => setDone("")} className="mt-3 text-sm font-semibold text-white/60 hover:text-white">Hacer otra reserva</button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="ld-name" className="mb-1.5 block text-sm font-bold text-white/80">Nombre</label>
                  <input id="ld-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[16px] outline-none focus:border-[#c6ff3d]" placeholder="Tu nombre" />
                </div>
                <div>
                  <label htmlFor="ld-phone" className="mb-1.5 block text-sm font-bold text-white/80">WhatsApp</label>
                  <input id="ld-phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[16px] outline-none focus:border-[#c6ff3d]" placeholder="300 000 0000" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ld-class" className="mb-1.5 block text-sm font-bold text-white/80">Clase</label>
                    <select id="ld-class" value={form.cls} onChange={(e) => setForm({ ...form, cls: e.target.value })} className="select-arrow h-12 w-full rounded-xl border border-white/15 bg-[#151515] px-4 text-[16px] outline-none focus:border-[#c6ff3d]">
                      {classes.map((c) => <option key={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="ld-time" className="mb-1.5 block text-sm font-bold text-white/80">Horario</label>
                    <select id="ld-time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="select-arrow h-12 w-full rounded-xl border border-white/15 bg-[#151515] px-4 text-[16px] outline-none focus:border-[#c6ff3d]">
                      {schedule.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                {error && <p role="alert" className="text-sm font-semibold text-red-400">{error}</p>}
                <button type="submit" className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-extrabold uppercase tracking-wide text-black transition hover:brightness-110" style={{ background: LIME }}>
                  <WhatsAppIcon /> Confirmar por WhatsApp
                </button>
              </form>
            )}
          </div>
        </section>
        <footer className="border-t border-white/10 py-6 text-center text-[13px] text-white/45">PULSO Studio es un negocio ficticio · Demo creada por NEXO DIGITAL STUDIO</footer>
      </div>
    </DemoShell>
  );
}
