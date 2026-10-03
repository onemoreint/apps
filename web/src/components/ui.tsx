import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { CapabilityStatus } from '../lib/capabilities';
import type { Compliance, DeviceState, RiskLevel } from '../lib/types';

// ---------- formato ----------
const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
export function ago(iso: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return 'hace un momento';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}
export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

// ---------- marca de capacidad: la forma codifica el estado ----------
export function CapabilityMark({ status, size = 16 }: { status: CapabilityStatus; size?: number }) {
  const label = status === 'SUPPORTED' ? 'Disponible' : status === 'PARTIAL' ? 'Parcial' : 'No permitido';
  if (status === 'SUPPORTED')
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" role="img" aria-label={label}>
        <circle cx="8" cy="8" r="7" fill="var(--color-managed)" />
        <path d="M4.6 8.2l2.2 2.2 4.6-4.8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (status === 'PARTIAL')
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" role="img" aria-label={label}>
        <path d="M8 1.2l7 13.2H1z" fill="var(--color-caution)" />
        <path d="M8 6v3.6" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="8" cy="12" r="0.95" fill="#fff" />
      </svg>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" role="img" aria-label={label}>
      <rect x="1.2" y="1.2" width="13.6" height="13.6" rx="2" fill="none" stroke="var(--color-denied)" strokeWidth="1.6" />
      <path d="M5 5l6 6M11 5l-6 6" stroke="var(--color-denied)" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

// ---------- pastillas de estado ----------
type Tone = 'managed' | 'caution' | 'denied' | 'neutral' | 'spruce';
const toneClass: Record<Tone, string> = {
  managed: 'bg-managed-soft text-managed',
  caution: 'bg-caution-soft text-[#7d5212]',
  denied: 'bg-denied-soft text-denied',
  neutral: 'bg-[#e8ecea] text-muted',
  spruce: 'bg-spruce text-paper',
};
export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${toneClass[tone]}`}>
      {children}
    </span>
  );
}

export function StatePill({ state }: { state: DeviceState }) {
  const map: Record<DeviceState, [Tone, string]> = {
    ONLINE: ['managed', 'En línea'],
    OFFLINE: ['neutral', 'Sin conexión'],
    PENDING: ['caution', 'Pendiente'],
    RETIRED: ['denied', 'Retirado'],
  };
  const [tone, label] = map[state];
  return (
    <Pill tone={tone}>
      <span className={`h-1.5 w-1.5 rounded-full ${state === 'ONLINE' ? 'bg-managed' : state === 'PENDING' ? 'bg-caution' : state === 'RETIRED' ? 'bg-denied' : 'bg-muted'}`} />
      {label}
    </Pill>
  );
}

export function CompliancePill({ value }: { value: Compliance }) {
  if (value === 'COMPLIANT') return <Pill tone="managed">Conforme</Pill>;
  if (value === 'NON_COMPLIANT') return <Pill tone="denied">No conforme</Pill>;
  return <Pill tone="neutral">Sin evaluar</Pill>;
}

export function RiskPill({ value }: { value: RiskLevel }) {
  if (value === 'HIGH') return <Pill tone="denied">Riesgo alto</Pill>;
  if (value === 'MEDIUM') return <Pill tone="caution">Riesgo medio</Pill>;
  return <Pill tone="managed">Riesgo bajo</Pill>;
}

// ---------- estructura de página ----------
export function PageHeader({ title, intro, actions }: { title: string; intro?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {intro && <p className="mt-1 text-sm text-muted">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ title, children, className = '', aside }: { title?: string; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <section className={`rounded-lg border border-line bg-panel ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

// ---------- modal ----------
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-spruce/40 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${width} max-h-[92vh] overflow-y-auto rounded-t-xl bg-panel shadow-xl sm:rounded-xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-panel px-5 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button className="rounded p-1 text-muted hover:bg-paper" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ---------- avisos ----------
type Toast = { id: number; text: string; tone: 'ok' | 'error' };
const ToastCtx = createContext<(text: string, tone?: 'ok' | 'error') => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, tone }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), tone === 'error' ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed right-4 bottom-4 z-[60] flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg border px-4 py-3 text-sm shadow-lg ${t.tone === 'ok' ? 'border-managed bg-panel' : 'border-denied bg-denied-soft text-denied'}`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={`flex items-start justify-between gap-4 py-2 ${disabled ? 'opacity-50' : ''}`}>
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-managed' : 'bg-line'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );
}
