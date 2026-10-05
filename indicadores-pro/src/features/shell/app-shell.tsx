import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { ConnectivityBanner } from '@/app/pwa'
import { DesktopSidebar } from './sidebar'
import { Topbar } from './topbar'

export function AppShell() {
  const { t } = useTranslation()
  return (
    <div className="min-h-dvh">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        {t('common.skipToContent')}
      </a>
      <DesktopSidebar />
      <div className="lg:pl-64">
        <Topbar />
        <ConnectivityBanner />
        <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-7xl px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
