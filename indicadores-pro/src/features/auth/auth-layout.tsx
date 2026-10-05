import { BarChart3, History, ShieldCheck, Smartphone, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Logo } from '@/components/logo'
import { FormAlert } from '@/components/form-alert'
import { isSupabaseConfigured } from '@/config/env'

/** Pantalla dividida: propuesta de valor a la izquierda (escritorio), formulario a la derecha. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { t } = useTranslation()
  const points = [
    { Icon: Users, text: t('auth.points.multiuser') },
    { Icon: History, text: t('auth.points.traceability') },
    { Icon: Smartphone, text: t('auth.points.mobile') },
    { Icon: ShieldCheck, text: t('auth.points.secure') },
  ]
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col">
        <Logo inverted />
        <div className="mt-auto max-w-md">
          <BarChart3 className="mb-6 size-10 text-sidebar-active" aria-hidden />
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-white">{t('auth.welcomeTitle')}</h1>
          <p className="mt-4 text-base leading-relaxed text-sidebar-muted">{t('auth.welcomeBody')}</p>
          <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4">
            {points.map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5 text-sm">
                <Icon className="mt-0.5 size-4 shrink-0 text-sidebar-active" aria-hidden />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Rejilla decorativa sutil */}
        <svg aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[28rem] opacity-[0.07]" viewBox="0 0 200 200">
          {Array.from({ length: 10 }, (_, i) => (
            <rect key={i} x={i * 20 + 4} y={200 - (i + 2) * 16} width="12" height={(i + 2) * 16} rx="3" fill="white" />
          ))}
        </svg>
      </aside>

      <main className="flex flex-col px-4 py-8 sm:px-8">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-7">{children}</div>
          {!isSupabaseConfigured && (
            <FormAlert tone="info" className="mt-8 text-xs">
              {t('auth.localNotice')}
            </FormAlert>
          )}
        </div>
      </main>
    </div>
  )
}
