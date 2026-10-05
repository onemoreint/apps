import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { NAV_ITEMS } from './nav-items'

/** Migas de pan derivadas de la ruta. Las rutas de detalle se agregan en fases posteriores. */
export function Breadcrumbs() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const first = `/${pathname.split('/')[1] ?? ''}`
  const item = NAV_ITEMS.find((i) => i.to === first)
  const current = item ? t(item.labelKey) : null
  return (
    <nav aria-label="breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm">
        <li className="hidden sm:block">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            {t('nav.home')}
          </Link>
        </li>
        {current && first !== '/' && (
          <>
            <ChevronRight className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden />
            <li aria-current="page" className="truncate font-medium">
              {current}
            </li>
          </>
        )}
      </ol>
    </nav>
  )
}
