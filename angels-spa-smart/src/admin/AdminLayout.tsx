import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { CalendarDays, Crown, Gift, Images, LayoutDashboard, LogOut, Menu, Scissors, Settings, Users, Wallet, ExternalLink, X } from 'lucide-react'
import { useAuth } from '../data/auth'
import { DemoRibbon, Logo, cx } from '../components/ui'
import { APP_MODE } from '../data'

export const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/admin/clientas', label: 'Clientas', icon: Users },
  { to: '/admin/servicios', label: 'Servicios', icon: Scissors },
  { to: '/admin/galeria', label: 'Galería', icon: Images },
  { to: '/admin/pagos', label: 'Pagos', icon: Wallet },
  { to: '/admin/promociones', label: 'Promociones', icon: Gift },
  { to: '/admin/fidelizacion', label: 'Fidelización', icon: Crown },
  { to: '/admin/configuracion', label: 'Configuración', icon: Settings },
]
const MOBILE_MAIN = NAV.slice(0, 4)

export function AdminLayout() {
  const { user, signOut } = useAuth()
  const [more, setMore] = useState(false)
  const loc = useLocation()

  const link = (n: (typeof NAV)[number]) => (
    <NavLink
      key={n.to}
      to={n.to}
      end={n.end}
      onClick={() => setMore(false)}
      className={({ isActive }) =>
        cx('flex min-h-[44px] items-center gap-3 rounded-2xl px-3.5 text-[0.95rem] transition', isActive ? 'bg-rose-700 text-white shadow-glow' : 'text-ink-600 hover:bg-blush-50 hover:text-ink')
      }
    >
      <n.icon className="h-[18px] w-[18px]" /> {n.label}
    </NavLink>
  )

  return (
    <div className="min-h-screen bg-ivory">
      {APP_MODE === 'demo' && <DemoRibbon className="sticky top-0 z-40" />}
      <div className="lg:flex">
        {/* Lateral escritorio */}
        <aside className="hidden w-64 shrink-0 border-r border-blush-100 bg-white/70 lg:block">
          <div className="sticky top-8 flex h-[calc(100vh-2rem)] flex-col p-5">
            <Link to="/admin" className="mb-8 px-2">
              <Logo />
            </Link>
            <nav className="flex-1 space-y-1" aria-label="Panel administrativo">{NAV.map(link)}</nav>
            <div className="space-y-1 border-t border-blush-100 pt-4">
              <Link to="/" target="_blank" className="flex min-h-[40px] items-center gap-3 rounded-2xl px-3.5 text-sm text-ink-600 hover:bg-blush-50">
                <ExternalLink className="h-4 w-4" /> Ver portal público
              </Link>
              <button onClick={signOut} className="flex min-h-[40px] w-full items-center gap-3 rounded-2xl px-3.5 text-sm text-ink-600 hover:bg-blush-50">
                <LogOut className="h-4 w-4" /> Cerrar sesión
              </button>
              <p className="truncate px-3.5 pt-2 text-xs text-ink-400">{user?.email}</p>
            </div>
          </div>
        </aside>

        {/* Encabezado móvil */}
        <header className="sticky top-[28px] z-30 flex items-center justify-between border-b border-blush-100 bg-ivory/90 px-4 py-2.5 backdrop-blur lg:hidden">
          <Logo compact />
          <span className="font-display text-lg font-semibold">{NAV.find((n) => (n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to)))?.label ?? 'Panel'}</span>
          <button onClick={signOut} aria-label="Cerrar sesión" className="grid h-10 w-10 place-items-center rounded-full text-ink-600 hover:bg-blush-50">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          <Outlet />
        </main>
      </div>

      {/* Navegación inferior móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-blush-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Navegación principal">
        <div className="grid grid-cols-5">
          {MOBILE_MAIN.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px]', isActive ? 'text-rose-700' : 'text-ink-400')}>
              <n.icon className="h-5 w-5" />
              {n.label}
            </NavLink>
          ))}
          <button onClick={() => setMore(true)} className="flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] text-ink-400">
            <Menu className="h-5 w-5" /> Más
          </button>
        </div>
      </nav>

      {more && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Más secciones">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMore(false)} />
          <div className="absolute inset-x-0 bottom-0 animate-fade-up rounded-t-4xl bg-ivory p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-xl font-semibold">Más secciones</p>
              <button onClick={() => setMore(false)} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-full hover:bg-blush-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1">{NAV.slice(4).map(link)}</div>
            <Link to="/" target="_blank" className="mt-2 flex min-h-[44px] items-center gap-3 rounded-2xl px-3.5 text-ink-600">
              <ExternalLink className="h-4 w-4" /> Ver portal público
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
