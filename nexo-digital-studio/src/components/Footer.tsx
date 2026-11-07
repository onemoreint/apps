import { ArrowUp, Mail, Clock, MapPin } from "lucide-react";
import { Logo } from "./Logo";
import { site, navLinks } from "../config/site";
import { services } from "../data/services";
import { waLink } from "../services/whatsapp";
import { routeHref } from "../hooks/useHashRoute";
import { WhatsAppIcon } from "./WhatsAppIcon";

const socialLabels: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", linkedin: "LinkedIn" };

export function Footer() {
  const socials = Object.entries(site.social).filter(([, url]) => !!url);
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-10 border-t border-white/[0.06] bg-ink-800/60">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#7857FF,#28C5FF,transparent)] opacity-60" />
      <div className="container-site grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo />
          <p className="mt-5 max-w-sm text-[15px] text-mist">{site.tagline}</p>
          <a href={waLink()} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#25D366]/10 px-4 py-2.5 text-sm font-bold text-[#4be38a] ring-1 ring-[#25D366]/30 transition hover:bg-[#25D366]/20">
            <WhatsAppIcon className="h-4 w-4" /> {site.contact.phoneDisplay}
          </a>
        </div>

        <nav aria-label="Secciones" className="md:col-span-2">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-white">Explorar</h3>
          <ul className="mt-4 space-y-2.5 text-[15px] text-mist">
            {navLinks.map((l) => <li key={l.href}><a className="hover:text-white" href={l.href}>{l.label}</a></li>)}
            <li><a className="hover:text-white" href="#contacto">Contacto</a></li>
          </ul>
        </nav>

        <nav aria-label="Servicios" className="md:col-span-3">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-white">Soluciones</h3>
          <ul className="mt-4 space-y-2.5 text-[15px] text-mist">
            {services.map((s) => <li key={s.id}><a className="hover:text-white" href="#servicios">{s.title}</a></li>)}
            <li><a className="hover:text-white" href={routeHref.demo("menu")}>Demo menú digital</a></li>
          </ul>
        </nav>

        <div className="md:col-span-3">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-white">Contacto</h3>
          <ul className="mt-4 space-y-3 text-[15px] text-mist">
            <li className="flex gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-electric" />{site.contact.area}</li>
            <li className="flex gap-2.5"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-electric" />{site.contact.hours}</li>
            {site.contact.email && (
              <li className="flex gap-2.5"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-electric" /><a className="hover:text-white" href={`mailto:${site.contact.email}`}>{site.contact.email}</a></li>
            )}
            {socials.length > 0 && (
              <li className="flex flex-wrap gap-2 pt-1">
                {socials.map(([k, url]) => (
                  <a key={k} href={url} target="_blank" rel="noopener noreferrer" className="rounded-full px-3 py-1.5 text-sm ring-1 ring-white/10 hover:text-white hover:ring-white/25">{socialLabels[k] ?? k}</a>
                ))}
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="hairline" />
      <div className="container-site flex flex-col items-center justify-between gap-4 py-6 text-center text-[13.5px] text-mist-700 sm:flex-row">
        <p>© {year} {site.name}. Todos los derechos reservados.</p>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <a className="hover:text-white" href={routeHref.privacy()}>Política de privacidad</a>
          <span>{site.credit.label}: <span className="text-mist">{site.credit.name}</span></span>
          <a href="#inicio" aria-label="Volver arriba" className="grid h-9 w-9 place-items-center rounded-full ring-1 ring-white/10 hover:text-white hover:ring-white/25"><ArrowUp className="h-4 w-4" /></a>
        </div>
      </div>
    </footer>
  );
}
