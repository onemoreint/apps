import { useState } from 'react'
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { DEMO_CREDENTIALS, useAuth } from '../data/auth'
import { Alert, Button, Card, DemoRibbon, Field, Input, Logo } from '../components/ui'
import { APP_MODE } from '../data'

export function Login() {
  const { user, signIn } = useAuth()
  const nav = useNavigate()
  const loc = useLocation() as { state?: { from?: string } }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to={loc.state?.from ?? '/admin'} replace />

  return (
    <div className="min-h-screen bg-ivory">
      {APP_MODE === 'demo' && <DemoRibbon />}
      <div className="grid min-h-[calc(100vh-28px)] place-items-center px-4 py-10">
        <Card className="w-full max-w-sm p-7">
          <div className="mb-6 flex flex-col items-center text-center">
            <Logo />
            <h1 className="mt-6 font-display text-3xl font-semibold">Panel administrativo</h1>
            <p className="mt-1 text-sm text-ink-600">Acceso exclusivo para el equipo del salón.</p>
          </div>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              const err = await signIn(email, password)
              setBusy(false)
              if (err) setError(err)
              else nav(loc.state?.from ?? '/admin', { replace: true })
            }}
          >
            {error && <Alert>{error}</Alert>}
            <Field label="Correo">{(id) => <Input id={id} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
            <Field label="Contraseña">{(id) => <Input id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
            <Button type="submit" className="w-full" disabled={busy}>
              <Lock className="h-4 w-4" /> {busy ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
          {APP_MODE === 'demo' && (
            <div className="mt-5 rounded-2xl bg-champagne-100 p-3 text-xs text-champagne-700">
              <p className="font-semibold">Credenciales de demostración</p>
              <p>
                {DEMO_CREDENTIALS.email} · {DEMO_CREDENTIALS.password}
              </p>
              <button
                type="button"
                className="mt-1 font-semibold underline"
                onClick={() => {
                  setEmail(DEMO_CREDENTIALS.email)
                  setPassword(DEMO_CREDENTIALS.password)
                }}
              >
                Autocompletar
              </button>
            </div>
          )}
          <Link to="/" className="mt-5 block text-center text-sm text-ink-600 hover:underline">
            ← Volver al portal
          </Link>
        </Card>
      </div>
    </div>
  )
}
