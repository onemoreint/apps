import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';
import type { Contact, Priority, Temperature } from '../domain/models';
import { PRIORITY_LABEL, tempInfo } from '../domain/labels';

export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="presentation">
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2 className="sheet-title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
        {footer && <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end', flexWrap: 'wrap' }}>{footer}</div>}
      </div>
    </div>
  );
}

const AVATAR_COLORS = ['#3b5bdb', '#9c36b5', '#c2255c', '#e8590c', '#2b8a3e', '#0b7285', '#5f3dc4', '#a61e4d', '#1971c2', '#087f5b'];
export function Avatar({ name, size }: { name: string; size?: 'lg' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const bg = AVATAR_COLORS[h % AVATAR_COLORS.length];
  return (
    <div className={`avatar ${size === 'lg' ? 'avatar-lg' : ''}`} style={{ background: `linear-gradient(135deg, ${bg}, ${bg}bb)` }} aria-hidden="true">
      {initials || '?'}
    </div>
  );
}

export const fullName = (c: Pick<Contact, 'firstName' | 'lastName'>) => `${c.firstName} ${c.lastName}`.trim();

export function TempBadge({ t, compact }: { t: Temperature; compact?: boolean }) {
  const info = tempInfo(t);
  return (
    <span className="badge" title={`Temperatura ${info.label.toLowerCase()}`}>
      {info.emoji}
      {!compact && ` ${info.label}`}
    </span>
  );
}

export function PriorityBadge({ p }: { p: Priority }) {
  return <span className={`badge badge-${p}`}>Prioridad {PRIORITY_LABEL[p].toLowerCase()}</span>;
}

export function Empty({ icon = 'info', title, children, action }: { icon?: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} size={28} />
      <b>{title}</b>
      {children && <div className="small">{children}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { key: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.key} type="button" role="radio" aria-checked={value === o.key} className={value === o.key ? 'on' : ''} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children, full, htmlFor }: { label: string; children: ReactNode; full?: boolean; htmlFor?: string }) {
  return (
    <div className={`field ${full ? 'full' : ''}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

export function Callout({ tone = 'info', icon, children }: { tone?: 'info' | 'warn' | 'good' | 'bad'; icon?: string; children: ReactNode }) {
  const i = icon ?? (tone === 'good' ? 'check' : tone === 'info' ? 'info' : 'alert');
  return (
    <div className={`callout ${tone}`}>
      <Icon name={i} size={18} />
      <div>{children}</div>
    </div>
  );
}

export function Progress({ value, max, good }: { value: number; max: number; good?: boolean }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`progress ${good ? 'good' : ''}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

export function waLink(phone: string, text?: string) {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
