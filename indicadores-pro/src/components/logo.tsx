import { appConfig } from '@/config/app.config'
import { cn } from '@/lib/utils'

/** Isotipo original: tres barras ascendentes con un punto de meta. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-8', className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <rect x="7" y="17" width="4" height="8" rx="1.5" fill="white" opacity="0.65" />
      <rect x="14" y="12" width="4" height="13" rx="1.5" fill="white" opacity="0.85" />
      <rect x="21" y="8" width="4" height="17" rx="1.5" fill="white" />
      <circle cx="23" cy="5.5" r="1.6" fill="white" />
    </svg>
  )
}

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className={cn('text-[15px] font-bold tracking-tight', inverted ? 'text-white' : 'text-foreground')}>
        {appConfig.name}
      </span>
    </span>
  )
}
