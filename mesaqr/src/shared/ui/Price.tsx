import { bsLabel, formatUsd } from '@/shared/lib/money';

interface Props {
  usd: number;
  rate: number;
  showBs: boolean;
  className?: string;
  strong?: boolean;
}

/** $7.00 con "≈ Bs." debajo si el negocio lo tiene activado. */
export function Price({ usd, rate, showBs, className = '', strong }: Props) {
  const bs = bsLabel(usd, rate, showBs);
  return (
    <span className={`inline-flex flex-col leading-tight ${className}`}>
      <span className={`font-display tabular-nums ${strong ? 'text-xl font-extrabold' : 'text-lg font-bold'}`}>{formatUsd(usd)}</span>
      {bs && <span className="text-xs whitespace-nowrap text-ink-3 tabular-nums">{bs}</span>}
    </span>
  );
}
