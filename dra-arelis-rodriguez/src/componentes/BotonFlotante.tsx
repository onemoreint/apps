import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { enlaceWhatsApp, mensajeGeneral } from '../whatsapp';

/**
 * Botón flotante de WhatsApp. Aparece después del inicio (donde ya hay un botón visible)
 * y se oculta al llegar al formulario y al pie, para no tapar contenido ni repetir botones.
 */
export function BotonFlotante() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const ocultos = ['inicio', 'cita'].map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const pie = document.querySelector('footer');
    if (pie) ocultos.push(pie);
    const enPantalla = new Set<Element>();
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) (e.isIntersecting ? enPantalla.add(e.target) : enPantalla.delete(e.target));
        setVisible(enPantalla.size === 0);
      },
      { threshold: 0.15 },
    );
    ocultos.forEach((el) => observador.observe(el));
    return () => observador.disconnect();
  }, []);

  return (
    <a
      href={enlaceWhatsApp(mensajeGeneral())}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Consultar por WhatsApp (abre en una pestaña nueva)"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex min-h-14 items-center gap-2.5 rounded-full bg-petroleo py-3 pr-5 pl-4 font-semibold text-white shadow-elevada ring-4 ring-crema/80 transition duration-400 hover:bg-petroleo-oscuro sm:right-6 sm:bottom-6 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      <MessageCircle aria-hidden className="size-6" strokeWidth={2} />
      <span className="text-[0.98rem]">WhatsApp</span>
    </a>
  );
}
