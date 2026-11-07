import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "./Logo";
import { waLink } from "../services/whatsapp";
import { WhatsAppIcon } from "./WhatsAppIcon";

interface Props {
  label: string;
  quoteMessage: string;
  children: ReactNode;
}

/** Barra superior común a todos los demos: identifica que es una demostración y permite volver. */
export function DemoShell({ label, quoteMessage, children }: Props) {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-[55] border-b border-white/10 bg-ink/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-site items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <a href="#showroom" className="inline-flex min-h-[40px] items-center gap-2 rounded-full pr-3 text-[13.5px] font-semibold text-mist-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            <LogoMark size={24} />
            <span className="hidden sm:inline">Volver a NEXO</span>
          </a>
          <span className="truncate text-center text-[11.5px] font-semibold uppercase tracking-[0.16em] text-mist-700">
            <span className="hidden sm:inline">{label} · </span><span className="text-electric-300">demo ficticia</span>
          </span>
          <a
            href={waLink(quoteMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 text-[12.5px] font-bold text-[#04210f]"
          >
            <WhatsAppIcon className="h-4 w-4" /> <span className="hidden sm:inline">Quiero uno así</span><span className="sm:hidden">Cotizar</span>
          </a>
        </div>
      </div>
      {children}
    </div>
  );
}
