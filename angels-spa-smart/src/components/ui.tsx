import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { AlertCircle, CheckCircle2, Info, Sparkles, X } from 'lucide-react'
import type { AppointmentStatus } from '../types'
import { STATUS_LABEL } from '../types'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

// ---------- Marca ----------
export function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <span className={cx('inline-flex items-baseline font-display font-semibold italic tracking-tight', light ? 'text-white' : 'text-berenjena')} aria-label="Angels Spa">
      {compact ? <span className="text-2xl">A</span> : <span className="text-[1.6rem] leading-none">Angels Spa</span>}
    </span>
  )
}

const TONES = [
  'from-[#F6E1E8] via-[#EFCAD6] to-[#E8B4C4]',
  'from-[#FFF4EC] via-[#F3EBDD] to-[#D6B98C]',
  'from-[#E8B4C4] via-[#C98C97] to-[#B76E79]',
  'from-[#F9EEF4] via-[#E9D7EA] to-[#CDB4DB]',
  'from-[#FFFFFF] via-[#F6E1E8] to-[#D6B98C]',
  'from-[#F3D6DE] via-[#E8B4C4] to-[#9A5563]',
]

/** Ilustración temporal (sin fotos de terceros). Siempre rotulada como demostrativa. */
export function DemoArt({ tone = 0, label = 'Imagen demostrativa', src, className, alt = '' }: { tone?: number; label?: string | null; src?: string; className?: string; alt?: string }) {
  if (src) return <img src={src} alt={alt} className={cx('h-full w-full object-cover', className)} loading="lazy" />
  return (
    <div className={cx('relative h-full w-full overflow-hidden bg-gradient-to-br', TONES[tone % TONES.length], className)} role="img" aria-label={alt || label || 'Ilustración'}>
      <svg viewBox="0 0 200 140" className="absolute inset-0 h-full w-full opacity-70" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i} transform={`translate(${42 + i * 30} ${46 + Math.abs(2 - i) * 9}) rotate(${(i - 2) * 6})`}>
            <rect x="-10" y="0" width="20" height="62" rx="10" fill="rgba(255,255,255,.55)" />
            <path d="M-9 4 Q0 -22 9 4 Z" fill="rgba(255,255,255,.9)" />
            <circle cx="0" cy="-4" r={i === 2 ? 2.4 : 1.4} fill={tone % 2 ? '#D6B98C' : '#B76E79'} opacity=".8" />
          </g>
        ))}
      </svg>
      {label && <span className="absolute left-2 top-2 rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-medium text-ink-600 backdrop-blur">{label}</span>}
    </div>
  )
}

// ---------- Controles ----------
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'whatsapp'
export function Button({ variant = 'primary', size = 'md', className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[.98]',
        size === 'sm' && 'min-h-[36px] px-3.5 text-sm',
        size === 'md' && 'min-h-[44px] px-5 text-[0.95rem]',
        size === 'lg' && 'min-h-[52px] px-7 text-base',
        variant === 'primary' && 'bg-rose-700 text-white shadow-glow hover:bg-rose-800',
        variant === 'secondary' && 'border border-rose/30 bg-white text-rose-800 hover:border-rose hover:bg-blush-50',
        variant === 'ghost' && 'text-ink-600 hover:bg-blush-50 hover:text-ink',
        variant === 'danger' && 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
        variant === 'whatsapp' && 'bg-[#1F8F4E] text-white hover:bg-[#187540]',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function LinkButton({ href, variant = 'primary', size = 'md', className, children, external }: { href: string; variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; className?: string; children: ReactNode; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 active:scale-[.98]',
        size === 'sm' && 'min-h-[36px] px-3.5 text-sm',
        size === 'md' && 'min-h-[44px] px-5 text-[0.95rem]',
        size === 'lg' && 'min-h-[52px] px-7 text-base',
        variant === 'primary' && 'bg-rose-700 text-white shadow-glow hover:bg-rose-800',
        variant === 'secondary' && 'border border-rose/30 bg-white text-rose-800 hover:border-rose hover:bg-blush-50',
        variant === 'ghost' && 'text-ink-600 hover:bg-blush-50',
        variant === 'whatsapp' && 'bg-[#1F8F4E] text-white hover:bg-[#187540]',
        className,
      )}
    >
      {children}
    </a>
  )
}

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cx('rounded-3xl border border-blush-100 bg-white shadow-soft', className)}>
      {children}
    </div>
  )
}

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  pendiente: 'bg-champagne-100 text-champagne-700 ring-champagne/40',
  confirmada: 'bg-blush-50 text-rose-800 ring-rose/30',
  completada: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  cancelada: 'bg-stone-100 text-stone-600 ring-stone-200 line-through decoration-stone-400/60',
  no_asistio: 'bg-red-50 text-red-700 ring-red-200',
}
export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>
}

export function Badge({ children, tone = 'rose' }: { children: ReactNode; tone?: 'rose' | 'champagne' | 'ink' | 'green' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        tone === 'rose' && 'bg-blush-50 text-rose-800',
        tone === 'champagne' && 'bg-champagne-100 text-champagne-700',
        tone === 'ink' && 'bg-stone-100 text-ink-600',
        tone === 'green' && 'bg-emerald-50 text-emerald-800',
      )}
    >
      {children}
    </span>
  )
}

const fieldBase = 'w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-[0.95rem] text-ink placeholder:text-ink-400 transition focus:border-rose focus:outline-none focus:ring-4 focus:ring-blush-100 aria-[invalid=true]:border-red-400'

export function Field({ label, error, hint, children, id }: { label: string; error?: string; hint?: string; children: (id: string, describedBy?: string) => ReactNode; id?: string }) {
  const auto = useId()
  const fid = id ?? auto
  const desc = error ? `${fid}-err` : hint ? `${fid}-hint` : undefined
  return (
    <div className="space-y-1.5">
      <label htmlFor={fid} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children(fid, desc)}
      {error ? (
        <p id={`${fid}-err`} className="flex items-center gap-1 text-sm text-red-700" role="alert">
          <AlertCircle className="h-4 w-4" aria-hidden /> {error}
        </p>
      ) : hint ? (
        <p id={`${fid}-hint`} className="text-xs text-ink-400">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(fieldBase, className)} />
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cx(fieldBase, 'min-h-[96px] resize-y', className)} />
export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(fieldBase, 'appearance-none bg-[length:16px] pr-10', className)} />

export function Checkbox({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; id?: string }) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <label htmlFor={fid} className="flex cursor-pointer items-start gap-3 text-sm text-ink-600">
      <input id={fid} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded border-blush-200 accent-[#9A5563]" />
      <span>{label}</span>
    </label>
  )
}

// ---------- Modal ----------
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input,select,textarea,button:not([data-close])')?.focus(), 30)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} className={cx('relative max-h-[92vh] w-full animate-fade-up overflow-y-auto rounded-t-4xl bg-ivory p-5 shadow-2xl sm:rounded-4xl sm:p-7', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
          <button data-close onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-600 hover:bg-blush-50" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ---------- Estados ----------
export function EmptyState({ icon: Icon = Sparkles, title, text, action }: { icon?: React.ComponentType<{ className?: string }>; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-blush-200 bg-white/60 px-6 py-12 text-center">
      <span className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-blush-50 text-rose-700">
        <Icon className="h-6 w-6" />
      </span>
      <p className="font-display text-xl font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-600">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'info' | 'success'; children: ReactNode }) {
  const Icon = tone === 'error' ? AlertCircle : tone === 'success' ? CheckCircle2 : Info
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx(
        'flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm',
        tone === 'error' && 'bg-red-50 text-red-800',
        tone === 'info' && 'bg-champagne-100 text-champagne-700',
        tone === 'success' && 'bg-emerald-50 text-emerald-800',
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  )
}

export function DemoRibbon({ className }: { className?: string }) {
  return (
    <div className={cx('flex items-center justify-center gap-2 bg-ink px-4 py-1.5 text-center text-xs text-ivory', className)}>
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-champagne" aria-hidden />
      <strong className="font-semibold tracking-wide">Modo demostración</strong>
      <span className="hidden text-ivory/70 sm:inline">· Datos, precios y fotos ficticios. Nada se envía ni se cobra.</span>
    </div>
  )
}

// ---------- Toasts ----------
interface Toast {
  id: number
  text: string
  tone: 'success' | 'error' | 'info'
}
const ToastCtx = createContext<(text: string, tone?: Toast['tone']) => void>(() => {})
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const push = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random()
    setItems((x) => [...x, { id, text, tone }])
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3800)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cx('pointer-events-auto flex max-w-md animate-fade-up items-center gap-2 rounded-full px-5 py-3 text-sm shadow-soft', t.tone === 'error' ? 'bg-red-700 text-white' : t.tone === 'info' ? 'bg-ink text-ivory' : 'bg-ink text-ivory')}>
            {t.tone === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-champagne" />}
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)

export function SectionTitle({ eyebrow, title, text, className }: { eyebrow?: string; title: string; text?: string; className?: string }) {
  return (
    <div className={cx('mb-6', className)}>
      {eyebrow && <p className="mb-1 text-xs font-medium uppercase tracking-[0.3em] text-champagne-700">{eyebrow}</p>}
      <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{title}</h2>
      {text && <p className="mt-2 max-w-xl text-ink-600">{text}</p>}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-[2.1rem]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Stat({ label, value, icon: Icon, hint }: { label: string; value: ReactNode; icon: React.ComponentType<{ className?: string }>; hint?: string }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-600">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-blush-50 text-rose-700">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 font-display text-3xl font-semibold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-400">{hint}</p>}
    </Card>
  )
}
