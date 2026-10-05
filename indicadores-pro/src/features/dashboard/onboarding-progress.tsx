import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export const ONBOARDING_STEPS = ['org', 'processes', 'catalogs', 'indicator', 'result', 'dashboard'] as const

/** Barra de progreso del asistente de primer uso (6 pasos). `current` = pasos completados. */
export function OnboardingProgress({ current }: { current: number }) {
  const { t } = useTranslation()
  const total = ONBOARDING_STEPS.length
  const pct = Math.round((Math.min(current, total) / total) * 100)
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{t('dashboard.progress', { done: Math.min(current, total), total })}</span>
        <span className="tabular">{pct}%</span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={current}
      >
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-3 hidden grid-cols-6 gap-2 sm:grid">
        {ONBOARDING_STEPS.map((step, i) => {
          const done = i < current
          const active = i === current
          return (
            <li key={step} className={cn('flex items-center gap-1.5 text-xs', active ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && 'border-primary text-primary',
                )}
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              <span className="truncate">{t(`dashboard.steps.${step}`)}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
