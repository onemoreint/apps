import type { Membership, Organization, OrgSettings, Profile, Role } from '../types'

/** Filas tal como las devuelve PostgREST (snake_case). */
export interface OrganizationRow {
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
  logo_url: string | null
  logo_secondary_url: string | null
  primary_color: string
  secondary_color: string
  is_demo: boolean
  health_mode: boolean
  onboarding_step: number
  created_at: string
  updated_at: string
}

export interface ProfileRow {
  id: string
  email: string
  full_name: string
  locale: 'es' | 'en'
}

export interface SettingsRow {
  organization_id: string
  currency: string
  locale: 'es' | 'en'
  timezone: string
  date_format: OrgSettings['dateFormat']
  decimal_separator: ',' | '.'
  percent_decimals: number
}

export const toOrganization = (r: OrganizationRow): Organization => ({
  id: r.id,
  name: r.name,
  nit: r.nit,
  address: r.address,
  phone: r.phone,
  email: r.email,
  country: r.country,
  city: r.city,
  sector: r.sector,
  responsible: r.responsible,
  logoUrl: r.logo_url,
  logoSecondaryUrl: r.logo_secondary_url,
  primaryColor: r.primary_color,
  secondaryColor: r.secondary_color,
  isDemo: r.is_demo,
  healthMode: r.health_mode,
  onboardingStep: r.onboarding_step,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const PATCH_COLUMNS: Record<string, keyof OrganizationRow> = {
  name: 'name',
  nit: 'nit',
  address: 'address',
  phone: 'phone',
  email: 'email',
  country: 'country',
  city: 'city',
  sector: 'sector',
  responsible: 'responsible',
  logoUrl: 'logo_url',
  logoSecondaryUrl: 'logo_secondary_url',
  primaryColor: 'primary_color',
  secondaryColor: 'secondary_color',
  healthMode: 'health_mode',
  onboardingStep: 'onboarding_step',
}

export function toOrganizationPatchRow(patch: Record<string, unknown>): Partial<OrganizationRow> {
  const row: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    const col = PATCH_COLUMNS[k]
    if (col && v !== undefined) row[col] = v
  }
  return row as Partial<OrganizationRow>
}

export const toProfile = (r: ProfileRow, isPlatformAdmin: boolean): Profile => ({
  id: r.id,
  email: r.email,
  fullName: r.full_name,
  locale: r.locale,
  isPlatformAdmin,
})

export const toSettings = (r: SettingsRow): OrgSettings => ({
  organizationId: r.organization_id,
  currency: r.currency,
  locale: r.locale,
  timezone: r.timezone,
  dateFormat: r.date_format,
  decimalSeparator: r.decimal_separator,
  percentDecimals: r.percent_decimals,
})

export const toMembership = (r: { organization_id: string; user_id: string; role: Role; status: Membership['status'] }): Membership => ({
  organizationId: r.organization_id,
  userId: r.user_id,
  role: r.role,
  status: r.status,
})
