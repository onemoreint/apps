import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Oculta el título visualmente (sigue disponible para lectores de pantalla). */
  hideTitle?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

/** Hoja inferior accesible basada en <dialog>: foco atrapado, Esc para cerrar. */
export function Sheet({ open, onClose, title, hideTitle, children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // toque en el fondo
      }}
    >
      {open && (
        <div className="relative flex max-h-[92dvh] flex-col">
          <div className={hideTitle ? 'absolute top-3 right-3 z-10' : 'flex items-center justify-between gap-3 px-5 pt-4 pb-2'}>
            <h2 className={hideTitle ? 'sr-only' : 'font-display text-xl font-bold'}>{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className={`ml-auto grid size-10 place-items-center rounded-full text-ink ${hideTitle ? 'bg-paper/90 shadow-md' : 'bg-shelf'}`}
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
          {footer && <div className="border-t border-line bg-paper px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
