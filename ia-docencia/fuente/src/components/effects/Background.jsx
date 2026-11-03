import { useEffect, useRef } from "react";
import ParticleField from "./ParticleField";

export default function Background() {
  const light = useRef(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const move = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (light.current) {
          light.current.style.opacity = "1";
          light.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        }
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="aurora aurora-a" />
      <div className="aurora aurora-b" />
      <ParticleField density={0.8} strength={0.55} className="absolute inset-0 h-full w-full" />
      <div ref={light} className="cursor-light" style={{ opacity: 0 }} />
    </div>
  );
}
