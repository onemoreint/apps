import { describe, expect, it } from 'vitest'
import { can, PERMISSIONS } from '@/lib/permissions'
import { ROLES } from '@/data/types'

describe('matriz de permisos', () => {
  it('el administrador tiene todos los permisos de organización', () => {
    for (const p of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) {
      expect(can('admin', p)).toBe(true)
    }
  })

  it('el lector solo puede ver', () => {
    expect(can('reader', 'dashboard.view')).toBe(true)
    expect(can('reader', 'indicator.edit')).toBe(false)
    expect(can('reader', 'result.record')).toBe(false)
    expect(can('reader', 'report.export')).toBe(false)
  })

  it('solo el administrador reabre períodos cerrados', () => {
    expect(ROLES.filter((r) => can(r, 'period.reopen'))).toEqual(['admin'])
  })

  it('el responsable de indicador registra resultados pero no edita fichas', () => {
    expect(can('indicator_owner', 'result.record')).toBe(true)
    expect(can('indicator_owner', 'indicator.edit')).toBe(false)
  })

  it('sin rol no hay permisos', () => {
    expect(can(null, 'dashboard.view')).toBe(false)
    expect(can(undefined, 'dashboard.view')).toBe(false)
  })
})
