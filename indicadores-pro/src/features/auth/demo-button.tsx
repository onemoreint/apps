import { PlayCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from './auth-context'

export function DemoButton() {
  const { t } = useTranslation()
  const { enterDemo } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t('common.or')}
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => {
          enterDemo()
          navigate('/', { replace: true })
        }}
      >
        <PlayCircle /> {t('auth.tryDemo')}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t('auth.tryDemoHint')}</p>
    </div>
  )
}
