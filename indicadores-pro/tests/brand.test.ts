import { describe, expect, it } from 'vitest'
import { applyBrand, hexToHsl, readableForeground } from '@/lib/brand'

describe('colores institucionales', () => {
  it('convierte hex a HSL', () => {
    expect(hexToHsl('#2563EB')).toEqual({ h: 221, s: 83, l: 53 })
    expect(hexToHsl('#fff')).toEqual({ h: 0, s: 0, l: 100 })
    expect(hexToHsl('azul')).toBeNull()
  })

  it('elige texto legible según el fondo', () => {
    expect(readableForeground('#2563EB')).toBe('0 0% 100%')
    expect(readableForeground('#FDE68A')).toBe('222 47% 11%')
  })

  it('aplica y limpia los tokens CSS', () => {
    const el = document.createElement('div')
    applyBrand({ primary: '#16A34A', secondary: '#0F172A' }, el)
    expect(el.style.getPropertyValue('--primary')).toBe('142 76% 36%')
    expect(el.style.getPropertyValue('--sidebar')).toBe('222 47% 11%')
    applyBrand(null, el)
    expect(el.style.getPropertyValue('--primary')).toBe('')
  })

  it('no usa un secundario claro en la barra lateral (contraste)', () => {
    const el = document.createElement('div')
    applyBrand({ primary: '#2563EB', secondary: '#F8FAFC' }, el)
    expect(el.style.getPropertyValue('--sidebar')).toBe('')
  })
})

import { initials } from '@/lib/utils'
describe('iniciales', () => {
  it('toma las dos primeras palabras con letras', () => {
    expect(initials('José Lugo')).toBe('JL')
    expect(initials('Industrias Andinas S.A.S.')).toBe('IA')
    expect(initials('DEMO · Clínica')).toBe('DC')
    expect(initials('')).toBe('?')
  })
})
