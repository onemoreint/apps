import { create } from 'zustand';
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export const claseCampo =
  'mt-1 block w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-[15px] ring-1 ring-linea placeholder:text-tinta-3 focus:outline-none focus:ring-2 focus:ring-acento disabled:bg-crema-2';

export function Campo({ etiqueta, ayuda, children, className = '' }: { etiqueta: string; ayuda?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-semibold text-tinta">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-tinta-3">{ayuda}</span>}
    </label>
  );
}

export function Entrada(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${claseCampo} ${props.className ?? ''}`} />;
}

export function Area(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${claseCampo} ${props.className ?? ''}`} />;
}

export function Interruptor({
  activo,
  onChange,
  etiqueta,
  ayuda,
  disabled,
}: {
  activo: boolean;
  onChange: (v: boolean) => void;
  etiqueta: string;
  ayuda?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start justify-between gap-4 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <span>
        <span className="block text-sm font-semibold text-tinta">{etiqueta}</span>
        {ayuda && <span className="block text-xs text-tinta-3">{ayuda}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={activo}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="h-6 w-11 rounded-full bg-linea transition peer-checked:bg-primario peer-focus-visible:ring-2 peer-focus-visible:ring-acento" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

type Variante = 'primario' | 'secundario' | 'peligro' | 'suave';

export function Boton({
  variante = 'primario',
  cargando,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; cargando?: boolean }) {
  const estilos: Record<Variante, string> = {
    primario: 'bg-primario text-en-primario hover:brightness-110',
    secundario: 'bg-white text-primario ring-1 ring-linea hover:bg-crema-2',
    peligro: 'bg-white text-peligro ring-1 ring-linea hover:bg-rosa/40',
    suave: 'text-tinta-2 hover:bg-crema-2',
  };
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || cargando}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${estilos[variante]} ${className}`}
    >
      {cargando && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Tarjeta({ titulo, acciones, children, className = '' }: { titulo?: string; acciones?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-papel p-4 ring-1 ring-linea/70 sm:p-5 ${className}`}>
      {(titulo || acciones) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {titulo && <h2 className="text-lg font-semibold text-primario">{titulo}</h2>}
          {acciones}
        </div>
      )}
      {children}
    </section>
  );
}

export function Vacio({ titulo, texto, children }: { titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-linea p-8 text-center">
      <p className="font-display text-lg text-primario">{titulo}</p>
      {texto && <p className="mt-1 text-sm text-tinta-2">{texto}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Avisos del panel
type Nota = { id: number; texto: string; tipo: 'ok' | 'error' };
export const useNotas = create<{ notas: Nota[]; notificar: (texto: string, tipo?: Nota['tipo']) => void; quitar: (id: number) => void }>(
  (set) => ({
    notas: [],
    notificar: (texto, tipo = 'ok') => set((s) => ({ notas: [...s.notas, { id: Date.now() + Math.random(), texto, tipo }] })),
    quitar: (id) => set((s) => ({ notas: s.notas.filter((n) => n.id !== id) })),
  }),
);

export function Notas() {
  const { notas, quitar } = useNotas();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      {notas.map((n) => (
        <NotaItem key={n.id} nota={n} quitar={quitar} />
      ))}
    </div>
  );
}

function NotaItem({ nota, quitar }: { nota: Nota; quitar: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => quitar(nota.id), nota.tipo === 'error' ? 6000 : 2800);
    return () => clearTimeout(t);
  }, [nota, quitar]);
  return (
    <div
      className={`aparecer pointer-events-auto max-w-md rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
        nota.tipo === 'error' ? 'bg-peligro text-white' : 'bg-tinta text-crema'
      }`}
    >
      {nota.texto}
    </div>
  );
}

export const notificar = (texto: string, tipo?: 'ok' | 'error') => useNotas.getState().notificar(texto, tipo);
