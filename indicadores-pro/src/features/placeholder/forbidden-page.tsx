import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'

export function ForbiddenPage() {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={Lock}
      title={t('errors.forbidden')}
      action={
        <Button asChild variant="secondary">
          <Link to="/">{t('placeholder.backHome')}</Link>
        </Button>
      }
    />
  )
}
