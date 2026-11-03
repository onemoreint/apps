import { WHATSAPP_GROUP_LINK } from "../../config/site";
import { trackJoinClick } from "../../lib/tracking";
import WhatsAppIcon from "./WhatsAppIcon";

const VARIANTS = { primary: "btn-primary", ghost: "btn-ghost", wa: "btn-wa" };

/* Único punto por donde salen todos los botones hacia el grupo de WhatsApp. */
export default function JoinLink({ location, variant = "primary", className = "", children, icon = true }) {
  return (
    <a
      href={WHATSAPP_GROUP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      data-cta={location}
      onClick={() => trackJoinClick(location)}
      className={`btn ${VARIANTS[variant]} ${className}`}
    >
      {icon && <WhatsAppIcon className="h-5 w-5 shrink-0" />}
      <span>{children}</span>
    </a>
  );
}
