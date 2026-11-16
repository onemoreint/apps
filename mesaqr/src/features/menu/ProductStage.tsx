import { useState, type PointerEvent, type KeyboardEvent } from 'react';
import { ProductImage } from '@/shared/ui/ProductImage';

interface Props {
  src: string | null;
  alt: string;
  className?: string;
}

/**
 * Presentación interactiva con perspectiva 3D ligera sobre la foto real.
 * No reemplaza una futura malla 3D: añade profundidad sin cargar modelos pesados.
 */
export function ProductStage({ src, alt, className = '' }: Props) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' && !dragging) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    setTilt({
      x: Math.max(-9, Math.min(9, (0.5 - y) * 18)),
      y: Math.max(-13, Math.min(13, (x - 0.5) * 26)),
    });
  };

  const reset = () => {
    setDragging(false);
    setTilt({ x: 0, y: 0 });
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = 6;
    if (event.key === 'ArrowLeft') setTilt((v) => ({ ...v, y: Math.max(-13, v.y - step) }));
    else if (event.key === 'ArrowRight') setTilt((v) => ({ ...v, y: Math.min(13, v.y + step) }));
    else if (event.key === 'ArrowUp') setTilt((v) => ({ ...v, x: Math.min(9, v.x + step) }));
    else if (event.key === 'ArrowDown') setTilt((v) => ({ ...v, x: Math.max(-9, v.x - step) }));
    else if (event.key === 'Escape') setTilt({ x: 0, y: 0 });
    else return;
    event.preventDefault();
  };

  return (
    <div
      className={`product-stage ${className} ${dragging ? 'product-stage--dragging' : ''}`}
      role="region"
      aria-label={`Vista con perspectiva de ${alt}. Arrastra o usa las flechas para explorar.`}
      tabIndex={0}
      onPointerMove={move}
      onPointerDown={onPointerDown}
      onPointerUp={reset}
      onPointerCancel={reset}
      onPointerLeave={() => {
        if (!dragging) setTilt({ x: 0, y: 0 });
      }}
      onKeyDown={onKeyDown}
    >
      <div className="product-stage__shadow" aria-hidden="true" />
      <div
        className="product-stage__surface"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        <ProductImage
          src={src}
          alt={alt}
          eager
          className="product-stage__image aspect-[16/10] w-full"
        />
        <span className="product-stage__glare" aria-hidden="true" />
      </div>
      <span className="product-stage__badge" aria-hidden="true">EXPLORA EL PRODUCTO</span>
      <span className="product-stage__hint" aria-hidden="true">
        <span className="product-stage__arrows">↔</span>
        Arrastra para explorar
      </span>
    </div>
  );
}
