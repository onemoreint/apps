import { useEffect, useState, type ReactNode } from 'react';

export function NumberField({
  label, value, onCommit, unit = 'm', step = 0.05, min, max, id, digits = 2,
}: {
  label?: string; value: number; onCommit: (v: number) => void; unit?: string; step?: number; min?: number; max?: number; id: string; digits?: number;
}) {
  const [text, setText] = useState(value.toFixed(digits));
  useEffect(() => setText(value.toFixed(digits)), [value, digits]);
  const commit = () => {
    const v = parseFloat(text.replace(',', '.'));
    if (Number.isFinite(v)) {
      const c = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
      if (Math.abs(c - value) > 1e-9) onCommit(+c.toFixed(digits));
      setText(c.toFixed(digits));
    } else setText(value.toFixed(digits));
  };
  const input = (
    <div className="input-unit">
      <input
        id={id}
        className="input num"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const v = +(value + (e.key === 'ArrowUp' ? step : -step)).toFixed(digits);
            const c = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
            onCommit(c);
          }
        }}
      />
      {unit && <em>{unit}</em>}
    </div>
  );
  if (!label) return input;
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      {input}
    </label>
  );
}

export function Seg<T extends string | number>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="section">
      <h3 className="section-title">
        <span>{title}</span>
        {aside}
      </h3>
      {children}
    </section>
  );
}

const paths: Record<string, ReactNode> = {
  plus: <path d="M8 3v10M3 8h10" />,
  save: <path d="M3 3h8l2 2v8H3zM5 3v3h5V3M5 13V9h6v4" />,
  folder: <path d="M2 4h4l1.5 1.5H14V13H2z" />,
  copy: <path d="M5 5h8v8H5zM3 11V3h8" />,
  download: <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M3 13h10" />,
  undo: <path d="M5 4 2 7l3 3M2 7h7a4 4 0 0 1 0 8H7" />,
  redo: <path d="m11 4 3 3-3 3M14 7H7a4 4 0 0 0 0 8h2" />,
  trash: <path d="M3 4h10M6 4V2.5h4V4M4.5 4l.7 9.5h5.6l.7-9.5" />,
  spark: <path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2" />,
  grid: <path d="M2 2h12v12H2zM2 6h12M2 10h12M6 2v12M10 2v12" />,
  minus: <path d="M3 8h10" />,
  fit: <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" />,
  rotate: <path d="M13 8a5 5 0 1 1-1.5-3.5M13 2v3h-3" />,
  door: <path d="M3 14V2h7v12M10 14a7 7 0 0 0 0-7" />,
  window: <path d="M2 5h12v6H2zM2 8h12M8 5v6" />,
  sofa: <path d="M2 7h12v5H2zM4 7V4h8v3" />,
  x: <path d="m4 4 8 8M12 4l-8 8" />,
  wand: <path d="m3 13 7-7M9 3l.5 1.5L11 5l-1.5.5L9 7l-.5-1.5L7 5l1.5-.5zM12.5 8l.3.9.9.3-.9.3-.3.9-.3-.9-.9-.3.9-.3z" />,
};

export function Icon({ name }: { name: keyof typeof paths | string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function Logo() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 16 10 3l6 13M6.3 11.2h7.4" stroke="#fff" strokeWidth={1.8} fill="none" strokeLinejoin="round" />
      <circle cx={10} cy={3} r={1.3} fill="#fff" />
    </svg>
  );
}
