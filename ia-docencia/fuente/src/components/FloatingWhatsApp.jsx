import { WHATSAPP_GROUP_LINK } from "../config/site";
import { trackJoinClick } from "../lib/tracking";
import JoinLink from "./ui/JoinLink";
import WhatsAppIcon from "./ui/WhatsAppIcon";

/* Escritorio y tableta: botón flotante. Teléfono: barra inferior fija. */
export default function FloatingWhatsApp() {
  return (
    <>
      <a
        href={WHATSAPP_GROUP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        data-cta="flotante"
        aria-label="Unirme al grupo de WhatsApp"
        title="Unirme al grupo de WhatsApp"
        onClick={() => trackJoinClick("flotante")}
        className="fixed z-50 hidden h-16 w-16 place-items-center rounded-full bg-wa text-[#04200f] shadow-[0_0_34px_-4px_rgba(37,211,102,.8)] transition-transform hover:scale-110 active:scale-95 md:grid"
        style={{ right: "calc(24px + env(safe-area-inset-right, 0px))", bottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}
      >
        <span aria-hidden="true" className="wa-ring absolute inset-0 rounded-full border-2 border-wa" />
        <WhatsAppIcon className="h-8 w-8" />
      </a>
      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-ink/95 pt-2.5 md:hidden"
        style={{
          paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
          paddingLeft: "max(16px, env(safe-area-inset-left, 0px))",
          paddingRight: "max(16px, env(safe-area-inset-right, 0px))",
        }}
      >
        <JoinLink location="barra-movil" variant="wa" className="w-full">Unirme al grupo</JoinLink>
      </div>
    </>
  );
}
