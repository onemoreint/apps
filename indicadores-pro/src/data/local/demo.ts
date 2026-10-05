import type { LocalRepository } from './local-repository'
import type { Session } from '../types'

export const DEMO_USER = { fullName: 'Usuario Demo', email: 'demo@indicadores.pro' } as const

export const DEMO_ORGANIZATION = {
  name: 'DEMO · Industrias Andinas S.A.S.',
  nit: '900.000.000-0',
  country: 'Colombia',
  city: 'Medellín',
  sector: 'Manufactura',
} as const

/**
 * Inicia la demostración en su propio espacio de almacenamiento ('demo').
 * Nunca lee ni escribe los datos reales del usuario.
 * Los procesos, indicadores, resultados y planes de ejemplo se agregan en las fases 2 a 6.
 */
export function startDemo(repo: LocalRepository): Session {
  const session = repo.ensureDemoUser(DEMO_USER.fullName, DEMO_USER.email)
  const hasOrg = repo.store.read().memberships.some((m) => m.userId === session.user.id)
  if (!hasOrg) repo.createOrganization(DEMO_ORGANIZATION, { isDemo: true })
  return session
}
