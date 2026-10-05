import type { AuthError, PostgrestError, SupabaseClient, User } from '@supabase/supabase-js'
import { AppError } from '@/lib/errors'
import type { AuthApi, DataRepository, OrganizationsApi, SignUpResult } from '../repository'
import type { MyOrganization, Role, Session } from '../types'
import {
  toOrganization,
  toOrganizationPatchRow,
  toProfile,
  toSettings,
  type OrganizationRow,
  type ProfileRow,
  type SettingsRow,
} from './mappers'

/** Traduce errores de Supabase a claves de mensaje amigables; el detalle técnico va al logger. */
function fail(error: AuthError | PostgrestError, fallback = 'errors.generic'): never {
  const msg = error.message?.toLowerCase() ?? ''
  if (msg.includes('invalid login credentials')) throw new AppError('auth.errors.invalidCredentials', error)
  if (msg.includes('already registered') || msg.includes('already been registered'))
    throw new AppError('auth.errors.emailInUse', error)
  if (msg.includes('email not confirmed')) throw new AppError('auth.errors.emailNotConfirmed', error)
  if ('code' in error && error.code === '42501') throw new AppError('errors.forbidden', error)
  throw new AppError(fallback, error)
}

/**
 * Adaptador de Supabase. Toda la seguridad real vive en Postgres (RLS + funciones);
 * este archivo solo traduce entre el contrato DataRepository y PostgREST.
 */
export class SupabaseRepository implements DataRepository {
  readonly kind = 'supabase' as const
  readonly auth: AuthApi
  readonly organizations: OrganizationsApi

  constructor(private readonly sb: SupabaseClient) {
    this.auth = {
      getSession: async () => {
        const { data, error } = await sb.auth.getSession()
        if (error) fail(error)
        return data.session ? this.sessionFor(data.session.user) : null
      },
      signIn: async (email, password) => {
        const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
        if (error) fail(error)
        return this.sessionFor(data.user)
      },
      signUp: async ({ fullName, email, password }): Promise<SignUpResult> => {
        const { data, error } = await sb.auth.signUp({
          email: email.trim(),
          password,
          // El trigger handle_new_user crea el perfil con este nombre.
          options: { data: { full_name: fullName.trim() } },
        })
        if (error) fail(error)
        if (!data.session || !data.user) return { status: 'confirm_email' }
        return { status: 'signed_in', session: await this.sessionFor(data.user) }
      },
      signOut: async () => {
        const { error } = await sb.auth.signOut()
        if (error) fail(error)
      },
      requestPasswordReset: async (email) => {
        const redirectTo = `${window.location.origin}${window.location.pathname}#/recuperar`
        const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo })
        if (error) fail(error)
      },
      onChange: (cb) => {
        const { data } = sb.auth.onAuthStateChange((_event, session) => {
          if (!session) return cb(null)
          // Se difiere para no llamar a Supabase dentro del callback de auth.
          setTimeout(() => {
            this.sessionFor(session.user).then(cb, () => cb(null))
          }, 0)
        })
        return () => data.subscription.unsubscribe()
      },
    }

    this.organizations = {
      listMine: async () => {
        const { data, error } = await sb
          .from('memberships')
          .select('role, organizations(*)')
          .eq('status', 'active')
        if (error) fail(error)
        const rows = (data ?? []) as unknown as { role: Role; organizations: OrganizationRow | null }[]
        return rows
          .filter((r) => r.organizations)
          .map((r): MyOrganization => ({ ...toOrganization(r.organizations!), role: r.role }))
          .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      },
      create: async (input) => {
        // Función SECURITY DEFINER: crea organización, membresía admin y configuración en una transacción.
        const { data, error } = await sb.rpc('create_organization', {
          p_name: input.name.trim(),
          p_nit: input.nit?.trim() || null,
          p_country: input.country?.trim() || null,
          p_city: input.city?.trim() || null,
          p_sector: input.sector?.trim() || null,
          p_primary_color: input.primaryColor ?? null,
          p_secondary_color: input.secondaryColor ?? null,
        })
        if (error) fail(error, 'org.errors.createFailed')
        return { ...toOrganization(data as OrganizationRow), role: 'admin' }
      },
      update: async (id, patch) => {
        const { data, error } = await sb
          .from('organizations')
          .update(toOrganizationPatchRow(patch))
          .eq('id', id)
          .select()
          .single()
        if (error) fail(error, 'org.errors.saveFailed')
        return toOrganization(data as OrganizationRow)
      },
      getSettings: async (organizationId) => {
        const { data, error } = await sb
          .from('org_settings')
          .select('*')
          .eq('organization_id', organizationId)
          .single()
        if (error) fail(error)
        return toSettings(data as SettingsRow)
      },
    }
  }

  private async sessionFor(user: User): Promise<Session> {
    const [{ data: profile }, { data: admin }] = await Promise.all([
      this.sb.from('profiles').select('id, email, full_name, locale').eq('id', user.id).maybeSingle(),
      this.sb.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle(),
    ])
    const row: ProfileRow = (profile as ProfileRow | null) ?? {
      id: user.id,
      email: user.email ?? '',
      full_name: (user.user_metadata?.full_name as string | undefined) ?? user.email ?? '',
      locale: 'es',
    }
    return { user: toProfile(row, Boolean(admin)), mode: 'supabase' }
  }
}
