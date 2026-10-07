interface Props {
  number: number;
  label?: string | null;
  size?: 'lg' | 'sm';
}

/** El elemento de identidad: un ticket de mesa con muescas de papel. */
export function TableTicket({ number, label, size = 'lg' }: Props) {
  const big = size === 'lg';
  return (
    <div
      className={`ticket inline-flex shrink-0 items-center text-ink ${big ? 'gap-2 rounded-xl px-4 py-2' : 'gap-1.5 rounded-lg px-3 py-1'}`}
      aria-label={label ? `Mesa ${number}, ${label}` : `Mesa ${number}`}
      role="img"
    >
      <span className={`font-display font-semibold ${big ? 'text-sm' : 'text-xs'}`} aria-hidden>
        📍 Mesa
      </span>
      <span
        className={`border-l-2 border-dashed border-ink/30 font-display leading-none font-extrabold tabular-nums ${
          big ? 'pl-2 text-3xl' : 'pl-1.5 text-lg'
        }`}
        aria-hidden
      >
        {number}
      </span>
      {label && big && (
        <span className="max-w-24 truncate text-xs font-medium text-ink/70" aria-hidden>
          {label}
        </span>
      )}
    </div>
  );
}
