import { describe, expect, it } from 'vitest'
import { loginSchema, registerSchema } from '@/features/auth/schemas'
import { organizationSchema } from '@/features/organization/schemas'

describe('validaciones', () => {
  it('exige correo válido', () => {
    expect(loginSchema.safeParse({ email: 'no-es-correo', password: 'x' }).success).toBe(false)
    expect(loginSchema.safeParse({ email: 'ana@empresa.co', password: 'x' }).success).toBe(true)
  })

  it('exige contraseña con letras y números, y que coincidan', () => {
    const base = { fullName: 'Ana Pérez', email: 'ana@empresa.co' }
    expect(registerSchema.safeParse({ ...base, password: '12345678', passwordConfirm: '12345678' }).success).toBe(false)
    expect(registerSchema.safeParse({ ...base, password: 'clave2026', passwordConfirm: 'otra2026' }).success).toBe(false)
    expect(registerSchema.safeParse({ ...base, password: 'clave2026', passwordConfirm: 'clave2026' }).success).toBe(true)
  })

  it('valida nombre y colores de la organización', () => {
    const ok = { name: 'Clínica Norte', primaryColor: '#2563EB', secondaryColor: '#0F172A' }
    expect(organizationSchema.safeParse(ok).success).toBe(true)
    expect(organizationSchema.safeParse({ ...ok, name: 'A' }).success).toBe(false)
    expect(organizationSchema.safeParse({ ...ok, primaryColor: 'azul' }).success).toBe(false)
  })
})
