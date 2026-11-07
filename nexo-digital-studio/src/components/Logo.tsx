import { site } from "../config/site";

/** Isotipo NEXO: dos nodos conectados formando una «N» luminosa. */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="nexo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7857FF" />
          <stop offset="1" stopColor="#28C5FF" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="#0d0f1c" stroke="url(#nexo-g)" strokeOpacity=".6" />
      <path d="M12 28V12l16 16V12" fill="none" stroke="url(#nexo-g)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.6" fill="#fff" />
      <circle cx="28" cy="28" r="2.6" fill="#28C5FF" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[17px] font-bold tracking-[0.14em] text-white">NEXO</span>
          <span className="mt-1 text-[9.5px] font-semibold tracking-[0.32em] text-mist">DIGITAL STUDIO</span>
        </span>
      )}
      <span className="sr-only">{site.name}</span>
    </span>
  );
}
