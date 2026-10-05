import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/** Pantalla de módulo aún no construido: deja claro en qué fase llega. */
export function ModulePlaceholder({ titleKey, icon, phase }: { titleKey: string; icon: LucideIcon; phase: string }) {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader title={t(titleKey)} actions={<Badge tone="primary">{t('common.comingIn', { phase })}</Badge>} />
      <Card>
        <EmptyState
          icon={icon}
          title={t('placeholder.title')}
          body={t('placeholder.body', { phase })}
          action={
            <Button asChild variant="secondary">
              <Link to="/">{t('placeholder.backHome')}</Link>
            </Button>
          }
        />
      </Card>
    </>
  )
}
