import { describe, expect, it } from 'vitest'
import { toCSV } from './csv'
describe('toCSV', () => {
  it('escapa comillas, comas y neutraliza fórmulas', () => {
    const out = toCSV([{ a: 'x,y', b: 'di "hola"', c: '=HYPERLINK("x")' }])
    expect(out).toBe('a,b,c\n"x,y","di ""hola""","\'=HYPERLINK(""x"")"')
  })
})
