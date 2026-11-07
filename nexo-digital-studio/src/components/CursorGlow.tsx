import { useEffect, useRef } from "react";
import { useFancyPointer } from "../hooks/useMediaQuery";

/**
 * Cursor interactivo SOLO en escritorio con mouse: un halo de luz que sigue el puntero
 * y un anillo que crece sobre elementos interactivos. No reemplaza el cursor del sistema.
 */
export function CursorGlow() {
  const enabled = useFancyPointer();
  const glow = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    let x = -500, y = -500, rx = x, ry = y, raf = 0, active = false, seen = false;
    const onMove = (e: PointerEvent) => {
      x = e.clientX; y = e.clientY;
      if (!seen) { seen = true; rx = x; ry = y; }
      const t = e.target as HTMLElement | null;
      active = !!t?.closest("a,button,[role=button],input,textarea,select,label");
    };
    const loop = () => {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      if (glow.current) glow.current.style.transform = `translate3d(${x - 200}px, ${y - 200}px, 0)`;
      if (ring.current) {
        ring.current.style.transform = `translate3d(${rx - 18}px, ${ry - 18}px, 0) scale(${active ? 1.6 : 1})`;
        ring.current.style.opacity = !seen ? "0" : active ? "0.9" : "0.45";
      }
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <div ref={glow} aria-hidden className="pointer-events-none fixed left-0 top-0 z-0 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(120,87,255,0.13),transparent_65%)]" />
      <div ref={ring} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[70] h-9 w-9 rounded-full border border-electric-400/70 opacity-0 mix-blend-screen" style={{ transition: "opacity .2s" }} />
    </>
  );
}
