import { brand } from '@/config/brand';

export function Logo({ size = 36 }: { size?: number }) {
  if (brand.logoUrl) return <img src={brand.logoUrl} alt={brand.name} width={size} height={size} className="rounded-xl" />;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={brand.name}>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={brand.colors.accent} />
          <stop offset="1" stopColor={brand.colors.accent2} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#lg)" />
      <path d="M14 40c5-14 10-14 15 0s10 14 15 0" fill="none" stroke={brand.colors.background} strokeWidth="5" strokeLinecap="round" />
      <circle cx="50" cy="16" r="4" fill={brand.colors.background} />
    </svg>
  );
}
