import { WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** Registra el service worker y avisa cuando hay una versión nueva (el usuario decide cuándo recargar). */
export function PwaUpdater() {
  const { t } = useTranslation()
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true })

  useEffect(() => {
    if (needRefresh) {
      toast(t('pwa.updateAvailable'), {
        duration: Infinity,
        action: { label: t('pwa.reload'), onClick: () => void updateServiceWorker(true) },
      })
    }
  }, [needRefresh, t, updateServiceWorker])

  useEffect(() => {
    if (offlineReady) toast.success(t('pwa.offlineReady'))
  }, [offlineReady, t])

  return null
}

export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export function ConnectivityBanner() {
  const { t } = useTranslation()
  const online = useOnline()
  if (online) return null
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-warning px-4 py-2 text-sm font-medium text-warning-foreground">
      <WifiOff className="size-4" aria-hidden /> {t('pwa.offline')}
    </div>
  )
}
