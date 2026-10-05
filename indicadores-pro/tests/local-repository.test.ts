import { beforeEach, describe, expect, it } from 'vitest'
import { LocalRepository } from '@/data/local/local-repository'
import { LocalStore } from '@/data/local/store'
import { startDemo, DEMO_ORGANIZATION } from '@/data/local/demo'
import { AppError } from '@/lib/errors'

const newRepo = (ns = 'test') => new LocalRepository('local', new LocalStore(ns))

async function errorKey(p: Promise<unknown>) {
  try {
    await p
    return null
  } catch (e) {
    return e instanceof AppError ? e.userMessageKey : 'unexpected'
  }
}

describe('repositorio local: autenticación', () => {
  let repo: LocalRepository
  beforeEach(() => {
    localStorage.clear()
    repo = newRepo()
  })

  it('registra, cierra sesión e inicia sesión', async () => {
    const r = await repo.auth.signUp({ fullName: 'Ana Pérez', email: 'Ana@Empresa.co ', password: 'clave2026' })
    expect(r.status).toBe('signed_in')
    await repo.auth.signOut()
    expect(await repo.auth.getSession()).toBeNull()
    const s = await repo.auth.signIn('ana@empresa.co', 'clave2026')
    expect(s.user.fullName).toBe('Ana Pérez')
  })

  it('no guarda la contraseña en texto plano', async () => {
    await repo.auth.signUp({ fullName: 'Ana', email: 'ana@e.co', password: 'clave2026' })
    expect(localStorage.getItem('ip.test.db')).not.toContain('clave2026')
  })

  it('rechaza contraseña incorrecta y correo inexistente con el mismo mensaje', async () => {
    await repo.auth.signUp({ fullName: 'Ana', email: 'ana@e.co', password: 'clave2026' })
    await repo.auth.signOut()
    expect(await errorKey(repo.auth.signIn('ana@e.co', 'mala1234'))).toBe('auth.errors.invalidCredentials')
    expect(await errorKey(repo.auth.signIn('nadie@e.co', 'clave2026'))).toBe('auth.errors.invalidCredentials')
  })

  it('no permite dos cuentas con el mismo correo', async () => {
    await repo.auth.signUp({ fullName: 'Ana', email: 'ana@e.co', password: 'clave2026' })
    expect(await errorKey(repo.auth.signUp({ fullName: 'Otra', email: 'ANA@e.co', password: 'clave2026' }))).toBe(
      'auth.errors.emailInUse',
    )
  })

  it('persiste entre instancias (recarga de página)', async () => {
    await repo.auth.signUp({ fullName: 'Ana', email: 'ana@e.co', password: 'clave2026' })
    const reloaded = newRepo()
    expect((await reloaded.auth.getSession())?.user.email).toBe('ana@e.co')
  })
})

describe('repositorio local: organizaciones y aislamiento', () => {
  let repo: LocalRepository
  beforeEach(() => {
    localStorage.clear()
    repo = newRepo()
  })

  it('crea la organización con el usuario como administrador y configuración por defecto', async () => {
    await repo.auth.signUp({ fullName: 'Ana', email: 'ana@e.co', password: 'clave2026' })
    const org = await repo.organizations.create({ name: '  Clínica Norte ' })
    expect(org.name).toBe('Clínica Norte')
    expect(org.role).toBe('admin')
    expect(org.primaryColor).toBe('#2563EB')
    expect((await repo.organizations.getSettings(org.id)).currency).toBe('COP')
  })

  it('rechaza nombres vacíos', async () => {
    await repo.auth.signUp({ fullName: 'Ana', email: 'ana@e.co', password: 'clave2026' })
    expect(await errorKey(repo.organizations.create({ name: ' ' }))).toBe('org.errors.nameRequired')
  })

  it('un usuario de la organización A no ve ni modifica la organización B', async () => {
    await repo.auth.signUp({ fullName: 'Ana', email: 'ana@e.co', password: 'clave2026' })
    const orgA = await repo.organizations.create({ name: 'Empresa A' })
    await repo.auth.signOut()

    await repo.auth.signUp({ fullName: 'Beto', email: 'beto@e.co', password: 'clave2026' })
    const orgB = await repo.organizations.create({ name: 'Empresa B' })

    const visible = await repo.organizations.listMine()
    expect(visible.map((o) => o.id)).toEqual([orgB.id])
    expect(await errorKey(repo.organizations.update(orgA.id, { name: 'Hackeada' }))).toBe('errors.forbidden')
    expect(await errorKey(repo.organizations.getSettings(orgA.id))).toBe('errors.forbidden')

    await repo.auth.signOut()
    await repo.auth.signIn('ana@e.co', 'clave2026')
    expect((await repo.organizations.listMine())[0]?.name).toBe('Empresa A')
  })

  it('sin sesión no se puede leer nada', async () => {
    expect(await errorKey(repo.organizations.listMine())).toBe('auth.errors.sessionExpired')
  })

  it('actualiza datos y colores', async () => {
    await repo.auth.signUp({ fullName: 'Ana', email: 'ana@e.co', password: 'clave2026' })
    const org = await repo.organizations.create({ name: 'Empresa A' })
    const updated = await repo.organizations.update(org.id, { phone: '604 000 0000', primaryColor: '#16A34A' })
    expect(updated.phone).toBe('604 000 0000')
    expect(updated.primaryColor).toBe('#16A34A')
  })
})

describe('demostración', () => {
  beforeEach(() => localStorage.clear())

  it('vive en un espacio separado y no ve datos reales', async () => {
    const real = new LocalRepository('local', new LocalStore('local'))
    await real.auth.signUp({ fullName: 'Ana', email: 'ana@e.co', password: 'clave2026' })
    await real.organizations.create({ name: 'Empresa Real' })

    const demo = new LocalRepository('demo', new LocalStore('demo'))
    const session = startDemo(demo)
    expect(session.mode).toBe('demo')
    const orgs = await demo.organizations.listMine()
    expect(orgs).toHaveLength(1)
    expect(orgs[0]?.name).toBe(DEMO_ORGANIZATION.name)
    expect(orgs[0]?.isDemo).toBe(true)

    // Los datos reales siguen intactos
    expect((await real.organizations.listMine()).map((o) => o.name)).toEqual(['Empresa Real'])
  })

  it('es idempotente: entrar dos veces no duplica la organización', async () => {
    const demo = new LocalRepository('demo', new LocalStore('demo2'))
    startDemo(demo)
    startDemo(demo)
    expect(await demo.organizations.listMine()).toHaveLength(1)
  })
})
