import { appConfig } from '@/config/app.config'
import { AppError } from '@/lib/errors'
import { can } from '@/lib/permissions'
import { uuid } from '@/lib/utils'
import type { AuthApi, DataRepository, OrganizationsApi, SignUpInput, SignUpResult } from '../repository'
import type {
  MyOrganization,
  NewOrganizationInput,
  Organization,
  OrganizationPatch,
  OrgSettings,
  Profile,
  Session,
} from '../types'
import { hashPassword, newSalt, safeEqual } from './password'
import { LocalStore, type StoredUser } from './store'

const normalizeEmail = (email: string) => email.trim().toLowerCase()
const now = () => new Date().toISOString()

const toProfile = (u: StoredUser): Profile => ({
  id: u.id,
  email: u.email,
  fullName: u.fullName,
  locale: u.locale,
  isPlatformAdmin: false,
})

export function defaultSettings(organizationId: string): OrgSettings {
  return {
    organizationId,
    currency: 'COP',
    locale: 'es',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota',
    dateFormat: 'dd/MM/yyyy',
    decimalSeparator: ',',
    percentDecimals: 2,
  }
}

export function buildOrganization(input: NewOrganizationInput, opts: { isDemo?: boolean } = {}): Organization {
  const name = input.name.trim()
  if (name.length < 2) throw new AppError('org.errors.nameRequired')
  const t = now()
  return {
    id: uuid(),
    name,
    nit: input.nit?.trim() || null,
    address: null,
    phone: null,
    email: null,
    country: input.country?.trim() || null,
    city: input.city?.trim() || null,
    sector: input.sector?.trim() || null,
    responsible: null,
    logoUrl: null,
    logoSecondaryUrl: null,
    primaryColor: input.primaryColor || appConfig.defaultBrand.primary,
    secondaryColor: input.secondaryColor || appConfig.defaultBrand.secondary,
    isDemo: opts.isDemo ?? false,
    healthMode: false,
    onboardingStep: 1,
    createdAt: t,
    updatedAt: t,
  }
}

/**
 * Adaptador que guarda todo en el navegador. Aplica las mismas reglas que RLS:
 * un usuario solo ve y modifica organizaciones donde tiene membresía activa.
 */
export class LocalRepository implements DataRepository {
  readonly auth: AuthApi
  readonly organizations: OrganizationsApi
  private listeners = new Set<(s: Session | null) => void>()

  constructor(
    readonly kind: 'local' | 'demo',
    readonly store: LocalStore = new LocalStore(kind),
  ) {
    this.auth = {
      getSession: async () => this.currentSession(),
      signIn: (email, password) => this.signIn(email, password),
      signUp: (input) => this.signUp(input),
      signOut: async () => {
        this.store.write((db) => {
          db.sessionUserId = null
        })
        this.emit(null)
      },
      requestPasswordReset: async () => {
        // En modo local no hay correo saliente; la pantalla explica cómo recuperar acceso.
        throw new AppError('auth.errors.resetUnavailableLocal')
      },
      onChange: (cb) => {
        this.listeners.add(cb)
        return () => this.listeners.delete(cb)
      },
    }

    this.organizations = {
      listMine: async () => this.listMine(),
      create: async (input) => this.createOrganization(input),
      update: async (id, patch) => this.updateOrganization(id, patch),
      getSettings: async (organizationId) => {
        this.requireRole(organizationId)
        return this.store.read().settings.find((s) => s.organizationId === organizationId) ?? defaultSettings(organizationId)
      },
    }
  }

  // ---------- autenticación ----------

  private currentSession(): Session | null {
    const db = this.store.read()
    const user = db.users.find((u) => u.id === db.sessionUserId)
    return user ? { user: toProfile(user), mode: this.kind } : null
  }

  private emit(session: Session | null) {
    this.listeners.forEach((cb) => cb(session))
  }

  private async signIn(email: string, password: string): Promise<Session> {
    const user = this.store.read().users.find((u) => u.email === normalizeEmail(email))
    // Mismo mensaje para "no existe" y "contraseña incorrecta": no revela qué correos están registrados.
    if (!user) throw new AppError('auth.errors.invalidCredentials')
    const hash = await hashPassword(password, user.salt)
    if (!safeEqual(hash, user.passwordHash)) throw new AppError('auth.errors.invalidCredentials')
    this.store.write((db) => {
      db.sessionUserId = user.id
    })
    const session = { user: toProfile(user), mode: this.kind }
    this.emit(session)
    return session
  }

  private async signUp(input: SignUpInput): Promise<SignUpResult> {
    const email = normalizeEmail(input.email)
    if (this.store.read().users.some((u) => u.email === email)) throw new AppError('auth.errors.emailInUse')
    const salt = newSalt()
    const user: StoredUser = {
      id: uuid(),
      email,
      fullName: input.fullName.trim(),
      locale: 'es',
      salt,
      passwordHash: await hashPassword(input.password, salt),
      createdAt: now(),
    }
    this.store.write((db) => {
      db.users.push(user)
      db.sessionUserId = user.id
    })
    const session = { user: toProfile(user), mode: this.kind }
    this.emit(session)
    return { status: 'signed_in', session }
  }

  /** Crea (o reutiliza) un usuario sin contraseña utilizable. Solo para la demo. */
  ensureDemoUser(fullName: string, email: string): Session {
    const existing = this.store.read().users.find((u) => u.email === email)
    const user =
      existing ??
      ({
        id: uuid(),
        email,
        fullName,
        locale: 'es',
        salt: newSalt(),
        passwordHash: '!demo',
        createdAt: now(),
      } satisfies StoredUser)
    this.store.write((db) => {
      if (!existing) db.users.push(user)
      db.sessionUserId = user.id
    })
    const session = { user: toProfile(user), mode: this.kind }
    this.emit(session)
    return session
  }

  // ---------- organizaciones ----------

  private requireUserId(): string {
    const id = this.store.read().sessionUserId
    if (!id) throw new AppError('auth.errors.sessionExpired')
    return id
  }

  /** Equivalente local de la política RLS: devuelve el rol o lanza si no hay acceso. */
  private requireRole(organizationId: string) {
    const userId = this.requireUserId()
    const m = this.store
      .read()
      .memberships.find((x) => x.organizationId === organizationId && x.userId === userId && x.status === 'active')
    if (!m) throw new AppError('errors.forbidden')
    return m.role
  }

  private listMine(): MyOrganization[] {
    const userId = this.requireUserId()
    const db = this.store.read()
    return db.memberships
      .filter((m) => m.userId === userId && m.status === 'active')
      .flatMap((m) => {
        const org = db.organizations.find((o) => o.id === m.organizationId)
        return org ? [{ ...org, role: m.role }] : []
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }

  createOrganization(input: NewOrganizationInput, opts: { isDemo?: boolean } = {}): MyOrganization {
    const userId = this.requireUserId()
    const org = buildOrganization(input, opts)
    this.store.write((db) => {
      db.organizations.push(org)
      db.memberships.push({ organizationId: org.id, userId, role: 'admin', status: 'active' })
      db.settings.push(defaultSettings(org.id))
    })
    return { ...org, role: 'admin' }
  }

  private updateOrganization(id: string, patch: OrganizationPatch): Organization {
    const role = this.requireRole(id)
    // onboardingStep lo puede avanzar cualquier admin; el resto exige org.manage.
    if (!can(role, 'org.manage')) throw new AppError('errors.forbidden')
    if (patch.name !== undefined && patch.name.trim().length < 2) throw new AppError('org.errors.nameRequired')
    return this.store.write((db) => {
      const org = db.organizations.find((o) => o.id === id)
      if (!org) throw new AppError('errors.notFound')
      Object.assign(org, patch, { updatedAt: now() })
      return { ...org }
    })
  }
}
