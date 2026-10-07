import { Minus, Plus, Trash2 } from 'lucide-react';
import { MAX_QTY } from '@/features/cart/cartMath';

interface Props {
  value: number;
  onChange: (n: number) => void;
  /** Si se pasa, en cantidad 1 el botón "−" se convierte en "eliminar". */
  onRemove?: () => void;
  label: string;
  size?: 'md' | 'lg';
}

export function QtyStepper({ value, onChange, onRemove, label, size = 'md' }: Props) {
  const btn = size === 'lg' ? 'size-12' : 'size-10';
  const canRemove = onRemove && value <= 1;
  return (
    <div className="inline-flex items-center rounded-full bg-shelf" role="group" aria-label={`Cantidad de ${label}`}>
      <button
        type="button"
        className={`${btn} grid place-items-center rounded-full disabled:opacity-35`}
        onClick={() => (canRemove ? onRemove() : onChange(value - 1))}
        disabled={!onRemove && value <= 1}
        aria-label={canRemove ? `Quitar ${label}` : 'Restar uno'}
      >
        {canRemove ? <Trash2 size={18} /> : <Minus size={18} />}
      </button>
      <span className="min-w-8 text-center font-display text-lg font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={`${btn} grid place-items-center rounded-full disabled:opacity-35`}
        onClick={() => onChange(value + 1)}
        disabled={value >= MAX_QTY}
        aria-label="Sumar uno"
      >
        <Plus size={18} />
      </button>
    </div>
  );
}
