import {
  AlertTriangle,
  CalendarX2,
  CheckCircle2,
  ClipboardList,
  Gauge,
  LineChart,
  ListTodo,
  Activity,
  type LucideIcon,
  BarChart3,
  XCircle,
  ArrowRight,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth-context'
import { useOrganization } from '@/features/organization/organization-context'
import { greetingKey } from '@/lib/utils'
import { ONBOARDING_STEPS, OnboardingProgress } from './onboarding-progress'

interface Kpi {
  key: string
  icon: LucideIcon
  tone: string
}

const KPIS: Kpi[] = [
  { key: 'indicators', icon: Gauge, tone: 'text-primary bg-accent' },
  { key: 'compliance', icon: CheckCircle2, tone: 'text-success bg-success/10' },
  { key: 'atRisk', icon: AlertTriangle, tone: 'text-warning bg-warning/15' },
  { key: 'failing', icon: XCircle, tone: 'text-destructive bg-destructive/10' },
  { key: 'openPlans', icon: ClipboardList, tone: 'text-primary bg-accent' },
  { key: 'overduePlans', icon: CalendarX2, tone: 'text-destructive bg-destructive/10' },
]

function KpiCard({ kpi }: { kpi: Kpi }) {
  const { t } = useTranslation()
  const Icon = kpi.icon
  return (
    <Card className="p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-[11px] font-semibold uppercase leading-tight tracking-normal text-muted-foreground sm:text-xs sm:tracking-wide">
          {t(`dashboard.kpis.${kpi.key}`)}
        </p>
        <span className={`flex size-7 shrink-0 sm:size-8 items-center justify-center rounded-md ${kpi.tone}`}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="tabular mt-2 text-2xl font-bold tracking-tight">—</p>
      <p className="text-xs text-muted-foreground">{t('dashboard.noData')}</p>
    </Card>
  )
}

function Section({ titleKey, icon: Icon, className }: { titleKey: string; icon: LucideIcon; className?: string }) {
  const { t } = useTranslation()
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t(titleKey)}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/40 px-4 py-8 text-center">
          <Icon className="size-6 text-muted-foreground/70" aria-hidden />
          <p className="text-sm text-muted-foreground">{t('dashboard.emptySection')}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { active, can } = useOrganization()
  const firstName = session?.user.fullName.split(' ')[0] ?? ''
  // Paso 1 (organización) queda completo al crearla; los demás se marcan cuando existan sus módulos.
  const stepsDone = Math.max(1, active?.onboardingStep ?? 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">
          {t(`dashboard.greeting.${greetingKey()}`, { name: firstName })}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('dashboard.subtitle')} · {active?.name}
        </p>
      </div>

      <section aria-label={t('dashboard.subtitle')} className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {KPIS.map((k) => (
          <KpiCard key={k.key} kpi={k} />
        ))}
      </section>

      {stepsDone < ONBOARDING_STEPS.length && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{t('dashboard.setupTitle')}</CardTitle>
              {active?.isDemo && <Badge tone="demo">{t('common.demoBadge')}</Badge>}
            </div>
            <CardDescription>{t('dashboard.setupBody')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <OnboardingProgress current={stepsDone} />
            {can('org.manage') && (
              <Button asChild variant="secondary" size="sm">
                <Link to="/configuracion">
                  {t('dashboard.steps.org')} <ArrowRight />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Section titleKey="dashboard.sections.evolution" icon={LineChart} className="lg:col-span-2" />
        <Section titleKey="dashboard.sections.byProcess" icon={BarChart3} />
        <Section titleKey="dashboard.sections.critical" icon={AlertTriangle} />
        <Section titleKey="dashboard.sections.pendingPlans" icon={ListTodo} />
        <Section titleKey="dashboard.sections.activity" icon={Activity} />
      </div>
    </div>
  )
}
