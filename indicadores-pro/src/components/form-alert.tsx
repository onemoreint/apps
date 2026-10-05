import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const tones = {
  error: { cls: 'border-destructive/30 bg-destructive/10 text-destructive', Icon: AlertCircle },
  success: { cls: 'border-success/30 bg-success/10 text-success', Icon: CheckCircle2 },
  info: { cls: 'border-primary/25 bg-accent text-accent-foreground', Icon: Info },
} as const

export function FormAlert({ tone, children, className }: { tone: keyof typeof tones; children: ReactNode; className?: string }) {
  const { cls, Icon } = tones[tone]
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-2.5 rounded-md border px-3 py-2.5 text-sm', cls, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="leading-snug">{children}</div>
    </div>
  )
}
