import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { asset } from '@/shared/lib/asset';

interface Props {
  src: string | null;
  alt: string;
  className?: string;
  eager?: boolean;
}

/** Imagen con carga diferida, decodificación asíncrona y respaldo si falla. */
export function ProductImage({ src, alt, className = '', eager }: Props) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`grid place-items-center bg-shelf text-ink-3 ${className}`} role="img" aria-label={alt}>
        <UtensilsCrossed size={28} />
      </div>
    );
  }
  return (
    <img
      src={asset(src)!}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={`bg-shelf object-cover ${className}`}
    />
  );
}
