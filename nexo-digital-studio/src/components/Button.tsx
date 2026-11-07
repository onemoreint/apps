import type { ReactNode, MouseEventHandler } from "react";

type Variant = "primary" | "secondary" | "ghost" | "whatsapp";

const base =
  "group relative inline-flex min-h-[48px] items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-3 text-[14.5px] font-bold uppercase tracking-[0.08em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "text-white bg-[linear-gradient(110deg,#7857FF,#5b8cff_55%,#28C5FF)] bg-[length:200%_100%] bg-left hover:bg-right shadow-[0_10px_40px_-10px_rgba(120,87,255,0.75)] hover:shadow-[0_14px_50px_-8px_rgba(40,197,255,0.6)] hover:-translate-y-0.5",
  secondary: "glass text-white hover:border-electric-500/50 hover:bg-white/[0.08] hover:-translate-y-0.5",
  ghost: "text-mist-300 hover:text-white normal-case tracking-normal font-semibold px-3",
  whatsapp: "text-[#04210f] bg-[#25D366] hover:bg-[#3be07a] shadow-[0_10px_34px_-10px_rgba(37,211,102,0.7)] hover:-translate-y-0.5",
};

interface Props {
  children: ReactNode;
  variant?: Variant;
  href?: string;
  external?: boolean;
  onClick?: MouseEventHandler<HTMLElement>;
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export function Button({ children, variant = "primary", href, external, onClick, type = "button", className = "", disabled, ariaLabel }: Props) {
  const cls = `${base} ${variants[variant]} ${className}`;
  const shine =
    variant === "primary" ? (
      <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.35),transparent)] transition-transform duration-700 group-hover:translate-x-full" />
    ) : null;
  if (href) {
    return (
      <a href={href} onClick={onClick} className={cls} aria-label={ariaLabel} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {shine}
        <span className="relative inline-flex items-center gap-2">{children}</span>
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} className={cls} disabled={disabled} aria-label={ariaLabel}>
      {shine}
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </button>
  );
}
