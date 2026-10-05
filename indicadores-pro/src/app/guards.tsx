import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import { useOrganization } from '@/features/organization/organization-context'
import { FullScreenLoader } from '@/components/full-screen-loader'
import { ForbiddenPage } from '@/features/placeholder/forbidden-page'
import type { Permission } from '@/lib/permissions'

/** Solo usuarios con sesión. Guarda la ruta pedida para volver después del login. */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <FullScreenLoader />
  if (status === 'signed_out') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Pantallas públicas (login, registro): si ya hay sesión, al dashboard. */
export function RequireGuest() {
  const { status } = useAuth()
  if (status === 'loading') return <FullScreenLoader />
  if (status === 'signed_in') return <Navigate to="/" replace />
  return <Outlet />
}

/** Exige una organización activa; si el usuario no tiene ninguna, va al asistente de bienvenida. */
export function RequireOrganization() {
  const { status, active } = useOrganization()
  if (status === 'loading') return <FullScreenLoader />
  if (status === 'ready' && !active) return <Navigate to="/bienvenida" replace />
  return <Outlet />
}

/** Oculta una ruta a quien no tiene el permiso. La base de datos lo vuelve a validar con RLS. */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can } = useOrganization()
  return can(permission) ? <>{children}</> : <ForbiddenPage />
}
