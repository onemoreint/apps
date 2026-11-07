import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { Logo } from "./Logo";
import { navLinks } from "../config/site";
import { waLink } from "../services/whatsapp";
import { useLockBody } from "../hooks/useLockBody";
import { WhatsAppIcon } from "./WhatsAppIcon";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");
  useLockBody(open);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Resalta la sección visible en la navegación.
  useEffect(() => {
    const ids = navLinks.map((l) => l.href.slice(1));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" }
    );
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? "py-2.5" : "py-4 sm:py-5"}`}>
      <div className="container-site">
        <nav
          aria-label="Principal"
          className={`flex items-center justify-between rounded-2xl px-3.5 py-2.5 transition-all duration-500 sm:px-5 ${scrolled ? "glass-strong shadow-[0_10px_40px_-15px_rgba(0,0,0,0.8)]" : "border border-transparent"}`}
        >
          <a href="#inicio" aria-label="NEXO DIGITAL STUDIO, ir al inicio" className="rounded-xl">
            <Logo />
          </a>

          <ul className="hidden items-center gap-1 lg:flex">
            {navLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className={`relative rounded-full px-4 py-2 text-[14.5px] font-semibold transition-colors ${active === l.href.slice(1) ? "text-white" : "text-mist hover:text-white"}`}
                >
                  {active === l.href.slice(1) && (
                    <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-white/[0.07] ring-1 ring-white/10" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
                  )}
                  <span className="relative">{l.label}</span>
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <a
              href="#contacto"
              className="hidden items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[13.5px] font-bold uppercase tracking-[0.08em] text-ink transition hover:bg-electric-300 sm:inline-flex"
            >
              Cotizar <ArrowUpRight className="h-4 w-4" />
            </a>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-xl text-white ring-1 ring-white/10 transition hover:bg-white/5 lg:hidden"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={open}
              aria-controls="menu-movil"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="menu-movil"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 top-0 z-[-1] bg-ink/95 backdrop-blur-xl lg:hidden"
          >
            <div className="flex h-full flex-col justify-between px-6 pb-safe pt-28">
              <ul className="space-y-1">
                {[...navLinks, { href: "#contacto", label: "Contacto" }].map((l, i) => (
                  <motion.li key={l.href} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
                    <a
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between border-b border-white/[0.06] py-4 font-display text-[28px] font-semibold text-white"
                    >
                      {l.label}
                      <ArrowUpRight className="h-5 w-5 text-mist" />
                    </a>
                  </motion.li>
                ))}
              </ul>
              <a
                href={waLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-6 flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-[#25D366] font-bold text-[#04210f]"
              >
                <WhatsAppIcon /> Escribir por WhatsApp
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
