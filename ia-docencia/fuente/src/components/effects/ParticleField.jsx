import { useRef } from "react";
import useCanvasLoop from "../../hooks/useCanvasLoop";

/* Partículas flotantes que se conectan al acercarse, como una red neuronal. */
export default function ParticleField({ density = 1, reach = 130, strength = 1, className = "" }) {
  const ref = useRef(null);
  useCanvasLoop(
    ref,
    (ctx, size) => {
      let pts = [];
      const seed = () => {
        const n = Math.round(((size.w * size.h) / 26000) * density);
        pts = Array.from({ length: Math.min(n, size.small ? 40 : 80) }, () => ({
          x: Math.random() * size.w,
          y: Math.random() * size.h,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: 0.8 + Math.random() * 1.4,
        }));
      };
      let sw = 0;
      let sh = 0;
      return () => {
        if (size.w !== sw || size.h !== sh) {
          sw = size.w;
          sh = size.h;
          seed();
        }
        ctx.clearRect(0, 0, size.w, size.h);
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          a.x = (a.x + a.vx + size.w) % size.w;
          a.y = (a.y + a.vy + size.h) % size.h;
          for (let j = i + 1; j < pts.length; j++) {
            const b = pts[j];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < reach) {
              ctx.strokeStyle = `rgba(90,170,255,${(1 - d / reach) * 0.3 * strength})`;
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
          ctx.fillStyle = `rgba(150,215,255,${0.65 * strength})`;
          ctx.beginPath();
          ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
          ctx.fill();
        }
      };
    },
    30
  );
  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
