import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../data/auth'

/** Ruta protegida: sin sesión → login. (En producción, la autorización real la aplica RLS en el servidor.) */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const loc = useLocation()
  if (!user) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />
  return <>{children}</>
}
