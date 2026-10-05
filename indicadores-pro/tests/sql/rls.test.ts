// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { PERMISSIONS } from '@/lib/permissions'
import { ROLES } from '@/data/types'

const root = join(__dirname, '..', '..')
const migrations = readdirSync(join(root, 'supabase/migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(root, 'supabase/migrations', f), 'utf8'))

const ANA = '11111111-1111-1111-1111-111111111111'
const BETO = '22222222-2222-2222-2222-222222222222'
const CARLA = '33333333-3333-3333-3333-333333333333'

let db: PGlite

/** Ejecuta como usuario autenticado (rol "authenticated" + auth.uid()), igual que PostgREST. */
async function as<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userId}', false);`)
  try {
    return await fn()
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`)
  }
}

async function rejects(p: Promise<unknown>) {
  try {
    await p
    return false
  } catch {
    return true
  }
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(readFileSync(join(__dirname, 'auth-stub.sql'), 'utf8'))
  for (const m of migrations) await db.exec(m)
  await db.exec(`
    grant select, insert, update, delete on all tables in schema public to authenticated;
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${ANA}', 'ana@a.co', '{"full_name":"Ana"}'),
      ('${BETO}', 'beto@b.co', '{"full_name":"Beto"}'),
      ('${CARLA}', 'carla@a.co', '{"full_name":"Carla"}');
  `)
}, 60_000)

describe('migración base en PostgreSQL', () => {
  it('crea el perfil automáticamente al registrarse', async () => {
    const r = await db.query<{ full_name: string }>(`select full_name from public.profiles where id = $1`, [ANA])
    expect(r.rows[0]?.full_name).toBe('Ana')
  })

  let orgA = ''
  let orgB = ''

  it('create_organization deja al creador como admin con configuración', async () => {
    orgA = await as(ANA, async () => {
      const r = await db.query<{ id: string }>(`select id from public.create_organization('Empresa A')`)
      return r.rows[0]!.id
    })
    orgB = await as(BETO, async () => {
      const r = await db.query<{ id: string }>(`select id from public.create_organization('Empresa B', '900-1')`)
      return r.rows[0]!.id
    })
    const m = await db.query<{ role: string }>(`select role from public.memberships where organization_id = $1`, [orgA])
    expect(m.rows).toEqual([{ role: 'admin' }])
    const s = await db.query(`select 1 from public.org_settings where organization_id = $1`, [orgB])
    expect(s.rows).toHaveLength(1)
  })

  it('sin sesión no se puede crear organización', async () => {
    expect(await rejects(as('', () => db.query(`select public.create_organization('Sin sesión')`)))).toBe(true)
  })

  it('AISLAMIENTO: Beto no ve, no edita y no se une a la organización de Ana', async () => {
    await as(BETO, async () => {
      const visible = await db.query<{ name: string }>(`select name from public.organizations`)
      expect(visible.rows.map((r) => r.name)).toEqual(['Empresa B'])

      const upd = await db.query(`update public.organizations set name = 'Hackeada' where id = $1`, [orgA])
      expect(upd.affectedRows).toBe(0)

      const settings = await db.query(`select * from public.org_settings where organization_id = $1`, [orgA])
      expect(settings.rows).toHaveLength(0)

      expect(
        await rejects(
          db.query(`insert into public.memberships (organization_id, user_id, role) values ($1, $2, 'admin')`, [orgA, BETO]),
        ),
      ).toBe(true)

      const logs = await db.query(`select * from public.audit_logs where organization_id = $1`, [orgA])
      expect(logs.rows).toHaveLength(0)
    })
    const name = await db.query<{ name: string }>(`select name from public.organizations where id = $1`, [orgA])
    expect(name.rows[0]?.name).toBe('Empresa A')
  })

  it('un lector ve la organización pero no puede modificarla', async () => {
    await as(ANA, () =>
      db.query(`insert into public.memberships (organization_id, user_id, role) values ($1, $2, 'reader')`, [orgA, CARLA]),
    )
    await as(CARLA, async () => {
      const visible = await db.query(`select id from public.organizations`)
      expect(visible.rows).toHaveLength(1)
      const upd = await db.query(`update public.organizations set phone = '123' where id = $1`, [orgA])
      expect(upd.affectedRows).toBe(0)
      const promote = await db.query(
        `update public.memberships set role = 'admin' where organization_id = $1 and user_id = $2`,
        [orgA, CARLA],
      )
      expect(promote.affectedRows).toBe(0)
    })
  })

  it('el admin edita y queda registro en auditoría', async () => {
    await as(ANA, async () => {
      const upd = await db.query(`update public.organizations set phone = '604 000' where id = $1`, [orgA])
      expect(upd.affectedRows).toBe(1)
      const logs = await db.query<{ action: string; old_phone: string | null; new_phone: string }>(
        `select action, old_data->>'phone' as old_phone, new_data->>'phone' as new_phone
         from public.audit_logs where table_name = 'organizations' and action = 'update' and organization_id = $1`,
        [orgA],
      )
      expect(logs.rows).toEqual([{ action: 'update', old_phone: null, new_phone: '604 000' }])
    })
  })

  it('rechaza colores inválidos', async () => {
    expect(
      await rejects(as(ANA, () => db.query(`update public.organizations set primary_color = 'azul' where id = $1`, [orgA]))),
    ).toBe(true)
  })

  it('no permite dejar una organización sin administrador', async () => {
    expect(
      await rejects(
        as(ANA, () =>
          db.query(`update public.memberships set role = 'reader' where organization_id = $1 and user_id = $2`, [orgA, ANA]),
        ),
      ),
    ).toBe(true)
  })

  it('has_permission() en SQL coincide con la matriz del frontend', async () => {
    // Ana queda como admin de respaldo en B para poder cambiar el rol de Beto sin dejar B sin admin.
    await db.exec(`insert into public.memberships (organization_id, user_id, role) values ('${orgB}', '${ANA}', 'admin');`)
    for (const role of ROLES) {
      await db.exec(`update public.memberships set role = '${role}' where organization_id = '${orgB}' and user_id = '${BETO}';`)
      for (const perm of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) {
        const r = await as(BETO, () =>
          db.query<{ ok: boolean }>(`select public.has_permission($1, $2) as ok`, [orgB, perm]),
        )
        expect({ role, perm, ok: r.rows[0]?.ok }).toEqual({
          role,
          perm,
          ok: (PERMISSIONS[perm] as readonly string[]).includes(role),
        })
      }
    }
  })
})
