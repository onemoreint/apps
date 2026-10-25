import type { Category } from '@/lib/types';

interface Props {
  category?: Pick<Category, 'colors' | 'glyph' | 'name' | 'image'>;
  image?: string;
  label?: string;
  className?: string;
  /** Dibuja los surcos de un disco: se usa en el reproductor ampliado. */
  vinyl?: boolean;
}

/** Portada generada (degradado + símbolo + surcos) o imagen propia si se configuró. */
export function Cover({ category, image, label, className = '', vinyl = false }: Props) {
  const [c1, c2] = category?.colors ?? ['#ff5a36', '#3b1d6e'];
  const src = image || category?.image;
  return (
    <div
      className={`${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative'} overflow-hidden ${vinyl ? 'rounded-full' : 'rounded-2xl'} ${className}`}
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})`, containerType: vinyl ? 'size' : undefined }}
      role="img"
      aria-label={label ?? category?.name ?? 'Portada'}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <>
          <svg className="absolute inset-0 h-full w-full opacity-25 mix-blend-overlay" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden>
            {[18, 28, 38, 48, 58, 68].map((r) => (
              <circle key={r} cx={vinyl ? 50 : 88} cy={vinyl ? 50 : 92} r={r} fill="none" stroke="#fff" strokeWidth="0.6" />
            ))}
          </svg>
          <span className={`absolute select-none drop-shadow-lg ${vinyl ? 'inset-0 grid place-items-center text-[28cqmin]' : 'left-[10%] top-[8%] text-[2.2em]'}`} aria-hidden>
            {category?.glyph ?? '🎵'}
          </span>
        </>
      )}
      {vinyl && <span className="absolute left-1/2 top-1/2 h-[12%] w-[12%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink ring-4 ring-white/20" aria-hidden />}
    </div>
  );
}
