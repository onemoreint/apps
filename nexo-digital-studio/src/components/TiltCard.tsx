import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import type { ReactNode, PointerEvent } from "react";
import { useFancyPointer } from "../hooks/useMediaQuery";

/** Tarjeta con profundidad 3D al mover el mouse (solo escritorio, sin movimiento reducido). */
export function TiltCard({ children, className = "", max = 8 }: { children: ReactNode; className?: string; max?: number }) {
  const enabled = useFancyPointer();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [max, -max]), { stiffness: 180, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-max, max]), { stiffness: 180, damping: 18 });
  const gx = useTransform(mx, (v) => `${v * 100}%`);
  const gy = useTransform(my, (v) => `${v * 100}%`);
  const glare = useTransform([gx, gy], ([x, y]) => `radial-gradient(420px circle at ${x} ${y}, rgba(40,197,255,0.12), transparent 45%)`);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const reset = () => { mx.set(0.5); my.set(0.5); };

  return (
    <motion.div
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={enabled ? { rotateX: rx, rotateY: ry, transformPerspective: 1000 } : undefined}
      className={`group relative preserve-3d ${className}`}
    >
      {enabled && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glare }}
        />
      )}
      {children}
    </motion.div>
  );
}
