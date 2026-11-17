// Autenticación del panel.
// - Modo demo: credencial fija de demostración, sesión en sessionStorage (se borra al cerrar la pestaña).
//   Esto NO es seguridad real: solo simula el flujo de inicio de sesión.
// - Producción (Fase 3): Supabase Auth (email + contraseña o enlace mágico), JWT con expiración
//   y refresh gestionados por el SDK; la autorización real la aplica RLS en el servidor.
import { createContext, useContext, useState, type ReactNode } from 'react'

export const DEMO_CREDENTIALS = { email: 'admin@demo.angelsspa', password: 'demo1234' }
const KEY = 'angels-spa-smart:demo-session'

interface AuthValue {
  user: { email: string; role: 'owner' } | null
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => void
}

const Ctx = createContext<AuthValue | null>(null)

function readSession() {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as { email: string; exp: number }
    if (Date.now() > s.exp) return null
    return { email: s.email, role: 'owner' as const }
  } catch {
    return null
  }
}

export function AuthProvider({ children, initialUser }: { children: ReactNode; initialUser?: AuthValue['user'] }) {
  const [user, setUser] = useState<AuthValue['user']>(initialUser !== undefined ? initialUser : readSession())
  const value: AuthValue = {
    user,
    async signIn(email, password) {
      await new Promise((r) => setTimeout(r, 250))
      if (email.trim().toLowerCase() !== DEMO_CREDENTIALS.email || password !== DEMO_CREDENTIALS.password)
        return 'Correo o contraseña incorrectos.'
      try {
        sessionStorage.setItem(KEY, JSON.stringify({ email: DEMO_CREDENTIALS.email, exp: Date.now() + 8 * 3600 * 1000 }))
      } catch {
        /* sesión solo en memoria */
      }
      setUser({ email: DEMO_CREDENTIALS.email, role: 'owner' })
      return null
    },
    signOut() {
      try {
        sessionStorage.removeItem(KEY)
      } catch {
        /* noop */
      }
      setUser(null)
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth fuera de AuthProvider')
  return v
}
