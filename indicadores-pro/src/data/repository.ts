import type {
  MyOrganization,
  NewOrganizationInput,
  Organization,
  OrganizationPatch,
  OrgSettings,
  Session,
} from './types'

/**
 * Contrato único de acceso a datos. Las pantallas solo conocen esta interfaz;
 * no saben si los datos vienen de Supabase o del navegador.
 * Cada fase agrega aquí sus módulos (procesos, catálogos, indicadores, resultados, planes…).
 */
export interface SignUpInput {
  fullName: string
  email: string
  password: string
}

export type SignUpResult = { status: 'signed_in'; session: Session } | { status: 'confirm_email' }

export interface AuthApi {
  getSession(): Promise<Session | null>
  signIn(email: string, password: string): Promise<Session>
  signUp(input: SignUpInput): Promise<SignUpResult>
  signOut(): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  /** Notifica cambios de sesión (inicio, cierre, expiración). Devuelve la función para desuscribirse. */
  onChange(callback: (session: Session | null) => void): () => void
}

export interface OrganizationsApi {
  listMine(): Promise<MyOrganization[]>
  create(input: NewOrganizationInput): Promise<MyOrganization>
  update(id: string, patch: OrganizationPatch): Promise<Organization>
  getSettings(organizationId: string): Promise<OrgSettings>
}

export interface DataRepository {
  readonly kind: 'local' | 'demo' | 'supabase'
  readonly auth: AuthApi
  readonly organizations: OrganizationsApi
}
