import { describe, expect, it } from 'vitest'
import { loyaltyDeltaForStatus, clientPoints } from './loyalty'
import type { Appointment, LoyaltyTransaction } from '../types'

const settings = { enabled: true, pointsPerVisit: 10, rewards: [] }
const a = (status: Appointment['status']) => ({ id: 'a1', clientId: 'c1', status }) as Appointment

describe('fidelización', () => {
  it('una cita completada genera puntos una sola vez', () => {
    expect(loyaltyDeltaForStatus(settings, [], a('completada'))).toEqual({ points: 10, kind: 'acumulacion' })
    const tx = [{ appointmentId: 'a1', clientId: 'c1', points: 10, kind: 'acumulacion' }] as LoyaltyTransaction[]
    expect(loyaltyDeltaForStatus(settings, tx, a('completada'))).toBeNull()
  })
  it('una cita cancelada no genera puntos y revierte los ya otorgados', () => {
    expect(loyaltyDeltaForStatus(settings, [], a('cancelada'))).toBeNull()
    const tx = [{ appointmentId: 'a1', clientId: 'c1', points: 10, kind: 'acumulacion' }] as LoyaltyTransaction[]
    expect(loyaltyDeltaForStatus(settings, tx, a('cancelada'))).toEqual({ points: -10, kind: 'reversion' })
    expect(clientPoints([...tx, { appointmentId: 'a1', clientId: 'c1', points: -10, kind: 'reversion' } as LoyaltyTransaction], 'c1')).toBe(0)
  })
  it('programa desactivado no acumula', () => {
    expect(loyaltyDeltaForStatus({ ...settings, enabled: false }, [], a('completada'))).toBeNull()
  })
})
