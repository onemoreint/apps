/**
 * Tipos de dominio compartidos por la interfaz y por los adaptadores de datos.
 * Reflejan las tablas de supabase/migrations (snake_case en BD, camelCase aquí).
 */

export type Role = 'admin' | 'quality_manager' | 'indicator_owner' | 'analyst' | 'reader'

export const ROLES: readonly Role[] = ['admin', 'quality_manager', 'indicator_owner', 'analyst', 'reader']

export interface Profile {
  id: string
  email: string
  fullName: string
  locale: 'es' | 'en'
  isPlatformAdmin: boolean
}

export interface Session {
  user: Profile
  /** 'local' = datos en este navegador; 'demo' = organización de demostración aislada; 'supabase' = nube */
  mode: 'local' | 'demo' | 'supabase'
}

export interface Organization {
  id: string
  name: string
  nit: string | null
  address: string | null
  phone: string | null
  email: string | null
  country: string | null
  city: string | null
  sector: string | null
  responsible: string | null
  logoUrl: string | null
  logoSecondaryUrl: string | null
  primaryColor: string
  secondaryColor: string
  isDemo: boolean
  healthMode: boolean
  onboardingStep: number
  createdAt: string
  updatedAt: string
}

export interface Membership {
  organizationId: string
  userId: string
  role: Role
  status: 'active' | 'invited' | 'disabled'
}

/** Organización tal como la ve el usuario actual: datos + su rol en ella. */
export interface MyOrganization extends Organization {
  role: Role
}

export interface OrgSettings {
  organizationId: string
  currency: string
  locale: 'es' | 'en'
  timezone: string
  dateFormat: 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd'
  decimalSeparator: ',' | '.'
  percentDecimals: number
}

export interface NewOrganizationInput {
  name: string
  nit?: string
  country?: string
  city?: string
  sector?: string
  primaryColor?: string
  secondaryColor?: string
}

export type OrganizationPatch = Partial<
  Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'isDemo'>
>
