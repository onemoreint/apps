import type { Role } from '@/data/types'

/**
 * Matriz de permisos acción → roles. Es la misma que aplica la función SQL
 * has_permission() en Supabase; el frontend la usa solo para mostrar u ocultar
 * acciones. La base de datos siempre vuelve a comprobarla (RLS).
 */
export const PERMISSIONS = {
  'dashboard.view': ['admin', 'quality_manager', 'indicator_owner', 'analyst', 'reader'],
  'indicator.view': ['admin', 'quality_manager', 'indicator_owner', 'analyst', 'reader'],
  'indicator.edit': ['admin', 'quality_manager'],
  'result.record': ['admin', 'quality_manager', 'indicator_owner'],
  'period.close': ['admin', 'quality_manager'],
  'period.reopen': ['admin'],
  'plan.view': ['admin', 'quality_manager', 'indicator_owner', 'analyst', 'reader'],
  'plan.edit': ['admin', 'quality_manager'],
  'plan.progress': ['admin', 'quality_manager', 'indicator_owner'],
  'report.export': ['admin', 'quality_manager', 'indicator_owner', 'analyst'],
  'process.manage': ['admin'],
  'catalog.manage': ['admin'],
  'user.manage': ['admin'],
  'org.manage': ['admin'],
  'settings.manage': ['admin'],
  'audit.view': ['admin'],
  'alert.view': ['admin', 'quality_manager', 'indicator_owner', 'analyst', 'reader'],
} as const satisfies Record<string, readonly Role[]>

export type Permission = keyof typeof PERMISSIONS

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false
  return (PERMISSIONS[permission] as readonly Role[]).includes(role)
}
