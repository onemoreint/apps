import { describe, expect, it } from 'vitest'
import { formatPhone, normalizePhone } from './phone'

describe('normalizePhone', () => {
  it('normaliza variantes de un mismo celular colombiano', () => {
    for (const v of ['3017298948', '301 729 8948', '+57 301 729 8948', '57-301-729-8948', '(301) 729.8948', '0057 3017298948'])
      expect(normalizePhone(v)).toBe('573017298948')
  })
  it('rechaza números inválidos', () => {
    for (const v of ['', '123', '2017298948', 'abc', '30172989']) expect(normalizePhone(v)).toBeNull()
  })
  it('formatea para mostrar', () => {
    expect(formatPhone('573017298948')).toBe('+57 301 729 8948')
  })
})
