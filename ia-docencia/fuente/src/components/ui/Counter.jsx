import { useLayoutEffect, useRef, useState } from "react";

/* Cuenta hasta un dato real del curso. Muestra el valor final si no hay animación. */
export default function Counter({ to, suffix = "", duration = 1200 }) {
  const ref = useRef(null);
  const [value, setValue] = useState(to);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf;
    const run = () => {
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / duration);
        setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      setValue(0);
      raf = requestAnimationFrame(tick);
    };
    const r = ref.current.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      run();
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        io.disconnect();
        run();
      }
    });
    io.observe(ref.current);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      <span aria-hidden="true">{value}{suffix}</span>
      <span className="sr-only">{to}{suffix}</span>
    </span>
  );
}
