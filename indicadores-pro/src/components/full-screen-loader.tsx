import { useTranslation } from 'react-i18next'
import { LogoMark } from './logo'

export function FullScreenLoader() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <LogoMark className="size-10 animate-pulse" />
      <span className="text-sm text-muted-foreground">{t('common.loading')}</span>
    </div>
  )
}
