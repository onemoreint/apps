import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { MessageCircle } from 'lucide-react';
import { enlaceWhatsApp } from '../whatsapp';

interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  mensaje?: string;
  children: ReactNode;
  icono?: boolean;
}

/** Enlace que abre la conversación de WhatsApp (app en el teléfono, WhatsApp Web en la computadora). */
export function EnlaceWhatsApp({ mensaje, children, icono = true, className = 'btn-principal', ...resto }: Props) {
  return (
    <a href={enlaceWhatsApp(mensaje)} target="_blank" rel="noopener noreferrer" className={className} {...resto}>
      {icono && <MessageCircle aria-hidden className="size-[1.15em] shrink-0" strokeWidth={2} />}
      {children}
      <span className="sr-only"> (abre WhatsApp en una pestaña nueva)</span>
    </a>
  );
}

/** Etiqueta pequeña para fotos que no son de la doctora. */
export function EtiquetaIlustrativa({ className = '' }: { className?: string }) {
  return (
    <span
      className={`rounded-full bg-white/85 px-3 py-1 text-[0.72rem] font-medium tracking-wide text-gris shadow-sm backdrop-blur ${className}`}
    >
      Imagen ilustrativa
    </span>
  );
}

/** Recuadro para datos pendientes de confirmar. */
export function Pendiente({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-salvia px-2 py-0.5 text-[0.85rem] text-salvia-oscuro">
      {children}
    </span>
  );
}
