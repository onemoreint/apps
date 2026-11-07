import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

/** Efecto de escritura para las respuestas de NEXO AI. */
export function TypingText({ text, speed = 14, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(reduced ? text.length : 0);

  useEffect(() => {
    if (reduced) { setCount(text.length); onDone?.(); return; }
    setCount(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += Math.max(1, Math.round(text.length / 220)); // textos largos escriben un poco más rápido
      setCount(Math.min(i, text.length));
      if (i >= text.length) { window.clearInterval(id); onDone?.(); }
    }, speed);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, reduced]);

  const done = count >= text.length;
  return (
    <span>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.slice(0, count)}
        {!done && <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-electric" />}
      </span>
    </span>
  );
}
