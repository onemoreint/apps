import { WHATSAPP_PATH } from "./whatsappPath";

export default function WhatsAppIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d={WHATSAPP_PATH} />
    </svg>
  );
}
