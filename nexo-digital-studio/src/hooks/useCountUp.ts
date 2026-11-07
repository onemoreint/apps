import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/** Anima un número hacia `target`. Se usa solo con datos reales (p. ej. totales del carrito). */
export function useCountUp(target: number, duration = 450) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reduced) { setValue(target); from.current = target; return; }
    const start = performance.now();
    const initial = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(initial + (target - initial) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); from.current = target; };
  }, [target, duration, reduced]);
  return value;
}
