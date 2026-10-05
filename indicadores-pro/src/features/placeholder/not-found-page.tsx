import { SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={SearchX}
      title={t('errors.notFoundTitle')}
      body={t('errors.notFound')}
      action={
        <Button asChild variant="secondary">
          <Link to="/">{t('placeholder.backHome')}</Link>
        </Button>
      }
    />
  )
}
