import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { ProductImage } from '@/shared/ui/ProductImage';
import { useAdmin } from './AdminContext';
import { uploadImage } from './lib';
import { Button } from './ui';

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  label: string;
  square?: boolean;
}

/** Sube una foto (comprimida a WebP en el teléfono antes de enviarla). */
export function ImageField({ value, onChange, label, square }: Props) {
  const { business } = useAdmin();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadImage(business.id, file));
    } catch (e) {
      console.error(e);
      setError('No se pudo subir la imagen. Prueba con otra foto (JPG o PNG).');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">{label}</p>
      <div className="flex items-center gap-4">
        <ProductImage src={value} alt={label} className={`shrink-0 rounded-2xl ${square ? 'size-20' : 'h-20 w-32'}`} />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" busy={busy} onClick={() => input.current?.click()}>
            <ImagePlus size={18} aria-hidden /> {value ? 'Cambiar' : 'Subir foto'}
          </Button>
          {value && (
            <Button variant="ghost" onClick={() => onChange(null)} aria-label="Quitar imagen">
              <Trash2 size={18} aria-hidden />
            </Button>
          )}
        </div>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => void pick(e.target.files?.[0])} />
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
