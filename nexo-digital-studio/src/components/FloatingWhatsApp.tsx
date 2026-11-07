import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { waLink } from "../services/whatsapp";

/** Botón flotante de WhatsApp visible en toda la web, con mensaje precargado. */
export function FloatingWhatsApp({ message }: { message?: string }) {
  const [show, setShow] = useState(false);
  const [hint, setHint] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 900);
    const t2 = setTimeout(() => setHint(true), 6000);
    const t3 = setTimeout(() => setHint(false), 13000);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed bottom-[max(1.1rem,env(safe-area-inset-bottom))] right-4 z-50 flex items-center gap-3 sm:right-6"
        >
          <AnimatePresence>
            {hint && (
              <motion.span
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="glass-strong hidden rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-xl sm:block"
              >
                ¿Hablamos de tu proyecto? 👋
              </motion.span>
            )}
          </AnimatePresence>
          <a
            href={waLink(message)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Escribir por WhatsApp"
            className="relative grid h-[58px] w-[58px] place-items-center rounded-full bg-[#25D366] text-[#04210f] shadow-[0_12px_32px_-6px_rgba(37,211,102,0.65)] transition-transform hover:scale-105 active:scale-95"
          >
            <span aria-hidden className="absolute inset-0 rounded-full bg-[#25D366] animate-pulse-ring" />
            <WhatsAppIcon className="relative h-7 w-7" />
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
