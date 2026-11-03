import { m, useScroll, useSpring } from "framer-motion";
import JoinLink from "./ui/JoinLink";

const links = [
  { href: "#programa", label: "Programa" },
  { href: "#herramientas", label: "Herramientas" },
  { href: "#preguntas", label: "Preguntas" },
];

export function Logo() {
  return (
    <span className="font-display text-[1.05rem] font-bold leading-none tracking-tight sm:text-xl">
      EDUCACIÓN <span className="text-neon">+</span> IA
    </span>
  );
}

export default function Navbar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });
  return (
    <header
      className="sticky z-40 border-b border-white/10 bg-ink/85 lg:backdrop-blur-md"
      style={{ top: "env(safe-area-inset-top, 0px)" }}
    >
      <nav aria-label="Principal" className="wrap flex h-[4.25rem] items-center justify-between gap-3">
        <a href="#inicio" className="min-w-0">
          <Logo />
          <span className="mt-1 block whitespace-nowrap text-[0.62rem] font-medium tracking-[0.06em] text-mute sm:text-[0.68rem]">
            FORMACIÓN DOCENTE | VENEZUELA
          </span>
        </a>
        <div className="flex items-center gap-7">
          <ul className="hidden gap-6 text-sm font-medium text-mute lg:flex">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="transition-colors hover:text-tech">{l.label}</a>
              </li>
            ))}
          </ul>
          <JoinLink location="navbar" variant="ghost" icon={false} className="!min-h-[2.6rem] shrink-0 !px-3.5 !py-2 text-[0.78rem] sm:!px-4 sm:text-sm">
            Unirme al grupo
          </JoinLink>
        </div>
      </nav>
      {/* Indicador de progreso de lectura */}
      <m.div
        aria-hidden="true"
        style={{ scaleX, transformOrigin: "0 50%", background: "linear-gradient(90deg,#00C8FF,#1769FF,#8747FF)" }}
        className="absolute inset-x-0 -bottom-px h-0.5"
      />
    </header>
  );
}
