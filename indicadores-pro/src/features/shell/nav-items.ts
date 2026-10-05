import {
  Bell,
  BookOpen,
  ClipboardList,
  FileBarChart,
  FolderTree,
  Gauge,
  History,
  LayoutDashboard,
  ListChecks,
  Settings,
  Tags,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Permission } from '@/lib/permissions'

export interface NavItem {
  to: string
  labelKey: string
  icon: LucideIcon
  permission: Permission
  group: 'main' | 'analyze' | 'admin'
}

/** Menú lateral (orden de la sección 88 del documento de requisitos). */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, permission: 'dashboard.view', group: 'main' },
  { to: '/indicadores', labelKey: 'nav.indicators', icon: Gauge, permission: 'indicator.view', group: 'main' },
  { to: '/resultados', labelKey: 'nav.results', icon: ListChecks, permission: 'indicator.view', group: 'main' },
  { to: '/planes', labelKey: 'nav.actionPlans', icon: ClipboardList, permission: 'plan.view', group: 'main' },
  { to: '/reportes', labelKey: 'nav.reports', icon: FileBarChart, permission: 'report.export', group: 'analyze' },
  { to: '/alertas', labelKey: 'nav.alerts', icon: Bell, permission: 'alert.view', group: 'analyze' },
  { to: '/procesos', labelKey: 'nav.processes', icon: FolderTree, permission: 'process.manage', group: 'admin' },
  { to: '/catalogos', labelKey: 'nav.catalogs', icon: Tags, permission: 'catalog.manage', group: 'admin' },
  { to: '/usuarios', labelKey: 'nav.users', icon: Users, permission: 'user.manage', group: 'admin' },
  { to: '/configuracion', labelKey: 'nav.settings', icon: Settings, permission: 'dashboard.view', group: 'admin' },
  { to: '/auditoria', labelKey: 'nav.audit', icon: History, permission: 'audit.view', group: 'admin' },
  { to: '/ayuda', labelKey: 'nav.help', icon: BookOpen, permission: 'dashboard.view', group: 'admin' },
]

export const NAV_GROUP_LABEL: Record<NavItem['group'], string> = {
  main: 'nav.groups.manage',
  analyze: 'nav.groups.analyze',
  admin: 'nav.groups.admin',
}
