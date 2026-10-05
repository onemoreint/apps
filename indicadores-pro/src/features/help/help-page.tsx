import { Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PERMISSIONS } from '@/lib/permissions'
import { ROLES } from '@/data/types'

const VS_ROWS = ['macros', 'files', 'multi', 'trace', 'mobile', 'alerts'] as const

const ROLE_ROWS: { label: string; perm: keyof typeof PERMISSIONS }[] = [
  { label: 'nav.dashboard', perm: 'dashboard.view' },
  { label: 'nav.indicators', perm: 'indicator.edit' },
  { label: 'nav.results', perm: 'result.record' },
  { label: 'nav.actionPlans', perm: 'plan.edit' },
  { label: 'nav.reports', perm: 'report.export' },
  { label: 'nav.users', perm: 'user.manage' },
]

export function HelpPage() {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader title={t('help.title')} description={t('help.subtitle')} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('help.modes.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {(['local', 'supabase', 'demo'] as const).map((k) => (
                <li key={k} className="leading-relaxed text-muted-foreground">
                  {t(`help.modes.${k}`)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('help.vsExcel.title')}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-3 font-semibold">{t('help.vsExcel.excel')}</th>
                  <th className="pb-2 font-semibold">{t('help.vsExcel.app')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {VS_ROWS.map((r) => {
                  const [bad, good] = t(`help.vsExcel.rows.${r}`, { returnObjects: true }) as [string, string]
                  return (
                    <tr key={r}>
                      <td className="py-2 pr-3 text-muted-foreground">
                        <span className="flex gap-1.5"><X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />{bad}</span>
                      </td>
                      <td className="py-2">
                        <span className="flex gap-1.5"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{good}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('help.roles.title')}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3" />
                  {ROLES.map((r) => (
                    <th key={r} className="pb-2 px-2 text-center font-semibold">{t(`roles.${r}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {ROLE_ROWS.map((row) => (
                  <tr key={row.perm}>
                    <td className="py-2 pr-3 font-medium">{t(row.label)}</td>
                    {ROLES.map((r) => {
                      const ok = (PERMISSIONS[row.perm] as readonly string[]).includes(r)
                      return (
                        <td key={r} className="px-2 py-2 text-center">
                          {ok ? (
                            <Check className="mx-auto size-4 text-success" aria-label="sí" />
                          ) : (
                            <span className="text-muted-foreground/50" aria-label="no">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-xs text-muted-foreground">{t('help.faq')}</p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
