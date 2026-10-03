import { users, organizations } from '../data/demo';
import { useStore } from '../store/store';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '../lib/rbac';
import { CapabilityMark } from '../components/ui';

export function Login() {
  const login = useStore((s) => s.login);
  return (
    <div className="min-h-full bg-spruce text-paper">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-12 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        <div>
          <svg width="44" height="44" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#21423a" />
            <path d="M9 21V11h4l3 6 3-6h4v10" fill="none" stroke="#cfe3dc" strokeWidth="2.4" strokeLinejoin="round" />
          </svg>
          <h1 className="mt-8 max-w-xl text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl">
            Administra tus equipos Android con lo que Android permite. Nada más.
          </h1>
          <p className="mt-5 max-w-lg text-mint/85">
            Android Control Center usa solo APIs oficiales de Android Enterprise. Cada dispositivo muestra qué se puede
            controlar en su modo de administración y por qué.
          </p>
          <div className="mt-10 max-w-md rounded-lg bg-spruce-2 p-5">
            <div className="mb-3 text-sm font-semibold">Perfil de trabajo en un Pixel 8a</div>
            {(
              [
                ['SUPPORTED', 'Configuraciones administradas'],
                ['SUPPORTED', 'Instalación silenciosa en el perfil'],
                ['PARTIAL', 'Cámara: solo apps del perfil'],
                ['UNSUPPORTED', 'Reinicio remoto'],
              ] as const
            ).map(([s, t]) => (
              <div key={t} className="flex items-center gap-3 py-1.5 text-sm">
                <CapabilityMark status={s} />
                {t}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-paper p-6 text-ink sm:p-8">
          <h2 className="text-xl font-bold">Entrar a la demo</h2>
          <p className="mt-1 text-sm text-muted">
            Elige un usuario para ver qué permite cada rol. No hay contraseñas: es una flota simulada.
          </p>
          <div className="mt-5 divide-y divide-line rounded-lg border border-line bg-panel">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => login(u.id)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-paper"
              >
                <span>
                  <span className="block font-semibold">
                    {u.name} <span className="font-normal text-muted">· {ROLE_LABELS[u.role]}</span>
                  </span>
                  <span className="block text-xs text-muted">
                    {u.organizationId ? organizations.find((o) => o.id === u.organizationId)?.name : 'Todas las organizaciones'} —{' '}
                    {ROLE_DESCRIPTIONS[u.role]}
                  </span>
                </span>
                <span className="text-sm font-semibold text-managed">Entrar</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">
            Código abierto en{' '}
            <a className="underline" href="https://github.com/onemoreint/apps/tree/android-control-center">
              github.com/onemoreint/apps (rama android-control-center)
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
