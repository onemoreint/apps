import { lazy, Suspense, useMemo } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider, useStore } from './data/store'
import { AuthProvider } from './data/auth'
import { createAdapter } from './data'
import type { DataAdapter } from './data/adapter'
import { ToastProvider, Logo } from './components/ui'
import { PublicHome } from './public/PublicHome'
import { BookingFlow } from './public/BookingFlow'
import { PrivacyPage } from './public/PrivacyPage'
import { RequireAuth } from './admin/RequireAuth'

// El panel administrativo se carga bajo demanda: el portal público queda más liviano.
const AdminLayout = lazy(() => import('./admin/AdminLayout').then((m) => ({ default: m.AdminLayout })))
const Login = lazy(() => import('./admin/Login').then((m) => ({ default: m.Login })))
const Dashboard = lazy(() => import('./admin/Dashboard').then((m) => ({ default: m.Dashboard })))
const Agenda = lazy(() => import('./admin/Agenda').then((m) => ({ default: m.Agenda })))
const Clients = lazy(() => import('./admin/Clients').then((m) => ({ default: m.Clients })))
const Services = lazy(() => import('./admin/Services').then((m) => ({ default: m.Services })))
const Gallery = lazy(() => import('./admin/Gallery').then((m) => ({ default: m.Gallery })))
const Payments = lazy(() => import('./admin/Payments').then((m) => ({ default: m.Payments })))
const Promotions = lazy(() => import('./admin/Promotions').then((m) => ({ default: m.Promotions })))
const Loyalty = lazy(() => import('./admin/Loyalty').then((m) => ({ default: m.Loyalty })))
const Settings = lazy(() => import('./admin/Settings').then((m) => ({ default: m.Settings })))

const Loading = () => (
  <div className="grid min-h-[50vh] place-items-center">
    <div className="animate-pulse"><Logo /></div>
  </div>
)

function Gate({ children }: { children: React.ReactNode }) {
  const { data, error } = useStore()
  if (error)
    return (
      <div className="grid min-h-screen place-items-center bg-ivory p-6 text-center">
        <div>
          <Logo />
          <p className="mt-6 text-ink-600">{error}</p>
        </div>
      </div>
    )
  if (!data)
    return (
      <div className="grid min-h-screen place-items-center bg-ivory">
        <div className="animate-pulse"><Logo /></div>
      </div>
    )
  return <>{children}</>
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/reservar" element={<BookingFlow />} />
      <Route path="/privacidad" element={<PrivacyPage />} />
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="clientas" element={<Clients />} />
        <Route path="servicios" element={<Services />} />
        <Route path="galeria" element={<Gallery />} />
        <Route path="pagos" element={<Payments />} />
        <Route path="promociones" element={<Promotions />} />
        <Route path="fidelizacion" element={<Loyalty />} />
        <Route path="configuracion" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}

export default function App({ adapter }: { adapter?: DataAdapter }) {
  const a = useMemo(() => adapter ?? createAdapter(), [adapter])
  return (
    <StoreProvider adapter={a}>
      <AuthProvider>
        <ToastProvider>
          <HashRouter>
            <Gate>
              <AppRoutes />
            </Gate>
          </HashRouter>
        </ToastProvider>
      </AuthProvider>
    </StoreProvider>
  )
}
