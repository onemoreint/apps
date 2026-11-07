import { useEffect } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { site } from "../config/site";
import { Logo } from "../components/Logo";
import { waLink } from "../services/whatsapp";

/**
 * Política de privacidad base. PENDIENTE: revisar con asesoría legal y completar
 * la razón social / documento del responsable antes de publicar en el dominio definitivo.
 */
export default function PrivacyPage() {
  useEffect(() => {
    document.title = `Política de privacidad · ${site.name}`;
    return () => { document.title = "NEXO DIGITAL STUDIO · Landing pages, páginas web, menús QR e IA para negocios"; };
  }, []);

  const sections: { h: string; p: string[] }[] = [
    { h: "1. Responsable del tratamiento", p: [`${site.name} es responsable de los datos personales recolectados a través de este sitio. Canal de contacto: WhatsApp ${site.contact.phoneDisplay}${site.contact.email ? ` y correo ${site.contact.email}` : ""}.`] },
    { h: "2. Datos que recolectamos", p: ["Solo los que tú decides compartir en el formulario de contacto o en los demos: nombre, nombre del negocio, número de WhatsApp, servicio de interés y la descripción de tu proyecto.", "Este sitio no guarda esos datos en servidores propios: el formulario construye un mensaje que se abre en tu WhatsApp y tú decides si lo envías."] },
    { h: "3. Finalidad", p: ["Responder tu solicitud, preparar una propuesta comercial y mantener la comunicación relacionada con tu proyecto. No vendemos ni cedemos tus datos a terceros con fines comerciales."] },
    { h: "4. Almacenamiento local y servicios de terceros", p: ["El demo de menú digital puede guardar tu carrito en el almacenamiento local de tu navegador para que no se pierda al recargar; puedes borrarlo vaciando el carrito o limpiando los datos del sitio.", "El sitio utiliza servicios externos para tipografías (Google Fonts) e imágenes de demostración (Unsplash). La mensajería se realiza a través de WhatsApp, sujeta a sus propias políticas.", "Si se habilita un asistente con inteligencia artificial conectado a un proveedor externo, los mensajes que escribas se procesarán en un servidor seguro para generar la respuesta; no escribas información sensible en el chat."] },
    { h: "5. Tus derechos", p: ["Puedes conocer, actualizar, rectificar y solicitar la eliminación de tus datos, así como revocar la autorización otorgada, escribiéndonos por los canales indicados. Responderemos dentro de los plazos que establezca la normativa aplicable (en Colombia, la Ley 1581 de 2012 y sus decretos reglamentarios)."] },
    { h: "6. Seguridad", p: ["Aplicamos medidas razonables para proteger la información. Las claves de servicios externos se gestionan en el servidor y nunca se exponen en el navegador."] },
    { h: "7. Cambios a esta política", p: ["Podemos actualizar esta política. La fecha de la última actualización aparece al inicio del documento."] },
  ];

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-ink/90 backdrop-blur-xl">
        <div className="container-site flex items-center justify-between py-3">
          <a href="#inicio" className="inline-flex min-h-[44px] items-center gap-2 text-[14px] font-semibold text-mist-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> Volver</a>
          <Logo compact />
        </div>
      </div>
      <main className="container-site max-w-3xl py-14 sm:py-20">
        <span className="eyebrow"><ShieldCheck className="h-3.5 w-3.5" /> Legal</span>
        <h1 className="mt-5 text-[clamp(2rem,5vw,3rem)] font-bold">Política de privacidad</h1>
        <p className="mt-3 text-mist">Última actualización: {site.privacyUpdated}</p>
        <div className="mt-10 space-y-9">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-[21px] font-semibold">{s.h}</h2>
              {s.p.map((p) => <p key={p.slice(0, 24)} className="mt-3 text-[16px] leading-relaxed text-mist-300">{p}</p>)}
            </section>
          ))}
        </div>
        <a href={waLink("Hola, tengo una consulta sobre el tratamiento de mis datos personales.")} target="_blank" rel="noopener noreferrer" className="mt-12 inline-flex min-h-[48px] items-center rounded-full bg-white/[0.06] px-5 font-semibold ring-1 ring-white/15 hover:bg-white/10">Consultar sobre mis datos</a>
      </main>
    </div>
  );
}
