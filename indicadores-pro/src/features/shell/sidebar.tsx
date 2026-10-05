import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { Logo } from '@/components/logo'
import { useOrganization } from '@/features/organization/organization-context'
import { cn } from '@/lib/utils'
import { NAV_GROUP_LABEL, NAV_ITEMS, type NavItem } from './nav-items'

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  const { can } = useOrganization()
  const visible = NAV_ITEMS.filter((i) => can(i.permission))
  const groups = (['main', 'analyze', 'admin'] as const)
    .map((g) => ({ g, items: visible.filter((i) => i.group === g) }))
    .filter((x) => x.items.length > 0)

  return (
    <nav aria-label={t('nav.main')} className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
      {groups.map(({ g, items }) => (
        <div key={g}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/80">
            {t(NAV_GROUP_LABEL[g])}
          </p>
          <ul className="space-y-0.5">
            {items.map((item) => (
              <SidebarLink key={item.to} item={item} onNavigate={onNavigate} />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const { t } = useTranslation()
  const Icon = item.icon
  return (
    <li>
      <NavLink
        to={item.to}
        end={item.to === '/'}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            'group flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors lg:h-10',
            isActive
              ? 'bg-sidebar-active text-white shadow-sm'
              : 'text-sidebar-foreground/85 hover:bg-white/[0.07] hover:text-white',
          )
        }
      >
        <Icon className="size-[18px] shrink-0" aria-hidden />
        <span className="truncate">{t(item.labelKey)}</span>
      </NavLink>
    </li>
  )
}

export function DesktopSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar lg:flex">
      <div className="flex h-16 items-center px-6">
        <Logo inverted />
      </div>
      <SidebarNav />
    </aside>
  )
}
