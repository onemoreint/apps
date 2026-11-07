import { useState, type FormEvent, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Send, CheckCircle2, Clock, MapPin, ShieldCheck, RotateCcw } from "lucide-react";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";
import { Button } from "../components/Button";
import { WhatsAppIcon } from "../components/WhatsAppIcon";
import { services, extraSolutions } from "../data/services";
import { site } from "../config/site";
import { isValidPhone, waLink } from "../services/whatsapp";
import { routeHref } from "../hooks/useHashRoute";

interface FormState {
  name: string;
  business: string;
  phone: string;
  service: string;
  description: string;
  consent: boolean;
}

type Errors = Partial<Record<keyof FormState, string>>;

const serviceOptions = [
  ...services.map((s) => s.title),
  ...extraSolutions.map((s) => s.label),
  "Aún no lo sé, quiero asesoría",
];

const EMPTY: FormState = { name: "", business: "", phone: "", service: "", description: "", consent: false };

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = "Escribe tu nombre.";
  if (f.business.trim().length < 2) e.business = "Escribe el nombre de tu negocio.";
  if (!isValidPhone(f.phone)) e.phone = "Escribe un WhatsApp válido, con indicativo (ej. +57 300 000 0000).";
  if (!f.service) e.service = "Elige un servicio.";
  if (f.description.trim().length < 10) e.description = "Cuéntanos un poco más (mínimo 10 caracteres).";
  if (!f.consent) e.consent = "Debes aceptar la política de privacidad para continuar.";
  return e;
}

/** Mensaje estructurado que llega al WhatsApp de la agencia. */
export function buildLeadMessage(f: FormState) {
  return [
    "🚀 *NUEVA SOLICITUD · " + site.name + "*",
    "",
    `👤 *Nombre:* ${f.name.trim()}`,
    `🏪 *Negocio:* ${f.business.trim()}`,
    `📱 *WhatsApp:* ${f.phone.trim()}`,
    `🧩 *Servicio:* ${f.service}`,
    "",
    "📝 *Descripción del proyecto:*",
    f.description.trim(),
    "",
    "Hola, quiero digitalizar mi negocio. Me gustaría recibir una propuesta.",
  ].join("\n");
}

export function ContactSection() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [sentLink, setSentLink] = useState<string | null>(null);

  const update = (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    const firstKey = Object.keys(found)[0];
    if (firstKey) {
      document.getElementById(`f-${firstKey}`)?.focus();
      return;
    }
    const link = waLink(buildLeadMessage(form));
    setSentLink(link);
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const err = (k: keyof FormState) =>
    errors[k] ? (
      <p id={`f-${k}-err`} role="alert" className="mt-1.5 text-[13.5px] font-medium text-red-300">{errors[k]}</p>
    ) : null;

  const aria = (k: keyof FormState) => ({
    id: `f-${k}`,
    "aria-invalid": !!errors[k],
    "aria-describedby": errors[k] ? `f-${k}-err` : undefined,
  });

  return (
    <section id="contacto" aria-labelledby="contacto-title" className="relative overflow-hidden py-20 sm:py-28">
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(120,87,255,0.22),transparent_60%)]" />
      <div className="container-site grid gap-12 lg:grid-cols-[1fr_1.25fr]">
        <div>
          <SectionHeading
            id="contacto-title"
            align="left"
            eyebrow="Hablemos"
            title={<>Llevemos tu negocio a <span className="text-gradient">otra dimensión.</span></>}
            intro="Completa el formulario y se abrirá WhatsApp con tu solicitud organizada. Te respondemos con una propuesta a la medida."
          />
          <Reveal delay={0.2}>
            <ul className="mt-9 space-y-4 text-[15.5px]">
              <li className="flex items-center gap-3 text-mist-300"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#25D366]/15 text-[#4be38a]"><WhatsAppIcon className="h-5 w-5" /></span>{site.contact.phoneDisplay}</li>
              <li className="flex items-center gap-3 text-mist-300"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.05] text-electric"><Clock className="h-5 w-5" /></span>{site.contact.hours}</li>
              <li className="flex items-center gap-3 text-mist-300"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.05] text-electric"><MapPin className="h-5 w-5" /></span>{site.contact.area}</li>
            </ul>
            <div className="mt-8">
              <Button variant="whatsapp" href={waLink()} external className="w-full sm:w-auto">
                <WhatsAppIcon /> Escribir por WhatsApp
              </Button>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="glass-strong relative rounded-[28px] p-5 sm:p-8">
            <AnimatePresence mode="wait">
              {sentLink ? (
                <motion.div key="ok" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="py-10 text-center" role="status">
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#25D366]/15 text-[#4be38a]"><CheckCircle2 className="h-8 w-8" /></span>
                  <h3 className="mt-5 text-2xl font-bold">¡Solicitud lista, {form.name.trim().split(" ")[0]}!</h3>
                  <p className="mx-auto mt-3 max-w-sm text-mist">Abrimos WhatsApp con tu mensaje. Si no se abrió automáticamente, usa el botón.</p>
                  <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Button variant="whatsapp" href={sentLink} external><WhatsAppIcon /> Abrir WhatsApp</Button>
                    <Button variant="secondary" onClick={() => { setSentLink(null); setForm(EMPTY); }}><RotateCcw className="h-4 w-4" /> Nueva solicitud</Button>
                  </div>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={onSubmit} noValidate initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-5 sm:grid-cols-2" aria-label="Solicitud de propuesta">
                  <div>
                    <label htmlFor="f-name" className="label">Nombre *</label>
                    <input {...aria("name")} className={`field ${errors.name ? "field-error" : ""}`} value={form.name} onChange={update("name")} autoComplete="name" placeholder="Tu nombre" maxLength={80} />
                    {err("name")}
                  </div>
                  <div>
                    <label htmlFor="f-business" className="label">Negocio *</label>
                    <input {...aria("business")} className={`field ${errors.business ? "field-error" : ""}`} value={form.business} onChange={update("business")} autoComplete="organization" placeholder="Nombre de tu negocio" maxLength={100} />
                    {err("business")}
                  </div>
                  <div>
                    <label htmlFor="f-phone" className="label">WhatsApp *</label>
                    <input {...aria("phone")} className={`field ${errors.phone ? "field-error" : ""}`} value={form.phone} onChange={update("phone")} type="tel" inputMode="tel" autoComplete="tel" placeholder="+57 300 000 0000" maxLength={24} />
                    {err("phone")}
                  </div>
                  <div>
                    <label htmlFor="f-service" className="label">Servicio solicitado *</label>
                    <select {...aria("service")} className={`field select-arrow pr-10 ${errors.service ? "field-error" : ""} ${form.service ? "" : "text-mist-700"}`} value={form.service} onChange={update("service")}>
                      <option value="" disabled>Selecciona una opción</option>
                      {serviceOptions.map((o) => <option key={o} value={o} className="bg-ink-700 text-white">{o}</option>)}
                    </select>
                    {err("service")}
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="f-description" className="label">Descripción del proyecto *</label>
                    <textarea {...aria("description")} rows={4} className={`field resize-none ${errors.description ? "field-error" : ""}`} value={form.description} onChange={update("description")} placeholder="¿Qué vendes, a quién y qué te gustaría lograr?" maxLength={800} />
                    <div className="flex justify-between">{err("description") ?? <span />}<span className="mt-1.5 text-[12px] text-mist-700">{form.description.length}/800</span></div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="flex cursor-pointer items-start gap-3 text-[14px] text-mist-300">
                      <input {...aria("consent")} type="checkbox" checked={form.consent} onChange={update("consent")} className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#7857FF]" />
                      <span>Autorizo el uso de mis datos para responder esta solicitud, según la <a href={routeHref.privacy()} className="font-semibold text-electric-300 underline-offset-2 hover:underline">política de privacidad</a>.</span>
                    </label>
                    {err("consent")}
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" className="w-full">
                      <Send className="h-4 w-4" /> Enviar solicitud por WhatsApp
                    </Button>
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12.5px] text-mist-700"><ShieldCheck className="h-3.5 w-3.5" /> Tus datos no se guardan en esta página: viajan solo en tu mensaje de WhatsApp.</p>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
