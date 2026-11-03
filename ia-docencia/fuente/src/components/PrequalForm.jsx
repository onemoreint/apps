import { useState } from "react";
import { Check, Copy, PencilLine } from "lucide-react";
import { WHATSAPP_CONTACT_NUMBER, WHATSAPP_GROUP_LINK } from "../config/site";
import { trackFormPrepared, trackJoinClick } from "../lib/tracking";
import WhatsAppIcon from "./ui/WhatsAppIcon";

function buildMessage({ nombre, especialidad, institucion, municipio }) {
  const lines = [
    `Hola, soy ${nombre.trim()}. Me interesa el curso Inteligencia Artificial Aplicada a la Docencia.`,
    `Especialidad: ${especialidad}.`,
  ];
  if (institucion.trim()) lines.push(`Institución: ${institucion.trim()}.`);
  if (municipio.trim()) lines.push(`Municipio o ciudad: ${municipio.trim()}.`);
  lines.push("Quisiera recibir la información y participar en la definición de la fecha.");
  return lines.join("\n");
}

const label = "mb-1.5 block text-sm font-medium";

export default function PrequalForm() {
  const [data, setData] = useState({ nombre: "", especialidad: "", institucion: "", municipio: "" });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [copy, setCopy] = useState("idle");

  const change = (e) => {
    setData((d) => ({ ...d, [e.target.name]: e.target.value }));
    setErrors((x) => ({ ...x, [e.target.name]: undefined }));
  };

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!data.nombre.trim()) next.nombre = "Escribe tu nombre para preparar el mensaje.";
    if (!data.especialidad) next.especialidad = "Elige tu especialidad docente.";
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(next.nombre ? "pq-nombre" : "pq-especialidad")?.focus();
      return;
    }
    setMessage(buildMessage(data));
    setCopy("idle");
    trackFormPrepared();
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopy("ok");
    } catch {
      setCopy("fail");
    }
  };

  const chatHref = `https://wa.me/${WHATSAPP_CONTACT_NUMBER}?text=${encodeURIComponent(message)}`;

  if (message) {
    return (
      <div className="glass rounded-2xl p-5 sm:p-7">
        <h3 className="font-display text-xl font-bold">Tu mensaje está listo</h3>
        <p className="mt-1.5 text-[0.95rem] leading-relaxed text-mute">WhatsApp no permite escribir por ti dentro de un grupo. Copia el mensaje, entra al grupo y pégalo allí.</p>
        <label htmlFor="pq-mensaje" className={`${label} mt-5`}>Mensaje</label>
        <textarea id="pq-mensaje" readOnly rows={8} value={message} onFocus={(e) => e.target.select()} className="field resize-none text-[0.95rem] leading-relaxed" />
        <div className="mt-4 flex flex-col gap-3">
          <a
            href={WHATSAPP_GROUP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            data-cta="formulario"
            onClick={() => {
              copyMessage();
              trackJoinClick("formulario");
            }}
            className="btn btn-wa w-full"
          >
            <WhatsAppIcon className="h-5 w-5 shrink-0" />
            <span>Copiar y abrir el grupo</span>
          </a>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={copyMessage} className="btn btn-ghost !min-h-[2.9rem] w-full text-sm">
              {copy === "ok" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copy === "ok" ? "Mensaje copiado" : "Solo copiar"}
            </button>
            <a href={chatHref} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !min-h-[2.9rem] w-full text-sm">
              {WHATSAPP_CONTACT_NUMBER ? "Enviar por chat" : "Elegir otro chat"}
            </a>
          </div>
        </div>
        <p aria-live="polite" className="mt-3 min-h-[1.25rem] text-sm text-mute">
          {copy === "ok" && "Mensaje copiado. Pégalo en el grupo."}
          {copy === "fail" && "Tu navegador no permitió copiar. Selecciona el texto del mensaje y cópialo a mano."}
        </p>
        <button type="button" onClick={() => setMessage("")} className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-neon hover:underline">
          <PencilLine className="h-4 w-4" aria-hidden="true" />
          Editar mis datos
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="glass rounded-2xl p-5 sm:p-7">
      <h3 className="font-display text-xl font-bold">Preséntate al grupo</h3>
      <p className="mt-1.5 text-[0.95rem] leading-relaxed text-mute">Es opcional. Completa tus datos y prepararemos un mensaje para que lo envíes por WhatsApp.</p>
      <div className="mt-5 grid gap-4">
        <div>
          <label htmlFor="pq-nombre" className={label}>Nombre</label>
          <input id="pq-nombre" name="nombre" autoComplete="name" value={data.nombre} onChange={change} aria-invalid={!!errors.nombre} aria-describedby={errors.nombre ? "pq-nombre-e" : undefined} className="field" />
          {errors.nombre && <p id="pq-nombre-e" className="mt-1.5 text-sm text-[#ffb3bf]">{errors.nombre}</p>}
        </div>
        <div>
          <label htmlFor="pq-especialidad" className={label}>Especialidad docente</label>
          <select id="pq-especialidad" name="especialidad" value={data.especialidad} onChange={change} aria-invalid={!!errors.especialidad} aria-describedby={errors.especialidad ? "pq-esp-e" : undefined} className="field">
            <option value="" disabled>Selecciona una opción</option>
            <option>Educación Especial</option>
            <option>Educación Inicial</option>
            <option>Otra especialidad docente</option>
          </select>
          {errors.especialidad && <p id="pq-esp-e" className="mt-1.5 text-sm text-[#ffb3bf]">{errors.especialidad}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pq-institucion" className={label}>Institución educativa <span className="font-normal text-mute">(opcional)</span></label>
            <input id="pq-institucion" name="institucion" value={data.institucion} onChange={change} className="field" />
          </div>
          <div>
            <label htmlFor="pq-municipio" className={label}>Municipio o ciudad <span className="font-normal text-mute">(opcional)</span></label>
            <input id="pq-municipio" name="municipio" autoComplete="address-level2" value={data.municipio} onChange={change} className="field" />
          </div>
        </div>
      </div>
      <button type="submit" className="btn btn-ghost mt-5 w-full">Preparar mi mensaje</button>
      <p className="mt-3 text-[0.82rem] leading-snug text-mute">Esta página no guarda ni envía tus datos. Solo se comparten si tú decides enviar el mensaje.</p>
    </form>
  );
}
