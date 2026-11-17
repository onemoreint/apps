// Escenarios de validación (Fase 5) sobre el adaptador de demostración.
import { beforeEach, describe, expect, it } from 'vitest'
import { DemoAdapter, memoryStorage, DEMO_STORAGE_KEY, type KVStorage } from './demoAdapter'
import { DomainError } from './adapter'
import { dashboardMetrics, clientStats, paymentState } from '../lib/metrics'
import { clientPoints } from '../lib/loyalty'
import { DEMO_STAFF_ID } from './seed'

const NOW = new Date('2026-11-16T14:00:00Z') // lunes 9:00 a. m. Bogotá
const THU = '2026-11-19'
let storage: KVStorage
let db: DemoAdapter

const consents = { dataTreatment: true, marketing: false }
const svc = async (name: string) => (await db.load()).services.find((s) => s.name === name)!

async function expectDomainError(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toBeInstanceOf(DomainError)
  await p.catch((e: DomainError) => expect(e.code).toBe(code))
}

beforeEach(() => {
  storage = memoryStorage()
  db = new DemoAdapter(storage, { now: () => NOW })
})

describe('1. Crear reserva', () => {
  it('crea una solicitud pendiente y registra a la clienta con teléfono normalizado', async () => {
    const mani = await svc('Manicure')
    const a = await db.createPublicBooking({ serviceId: mani.id, date: THU, startMin: 15 * 60, name: 'Clienta Prueba Uno', phone: '310 555 0101', consents })
    expect(a.status).toBe('pendiente')
    expect(a.endMin - a.startMin).toBe(mani.durationMin)
    const data = await db.load()
    const c = data.clients.find((x) => x.id === a.clientId)!
    expect(c.phone).toBe('573105550101')
    expect(c.consents.dataTreatment).toBe(true)
    expect(data.audit[0].action).toBe('reserva_publica')
  })

  it('exige autorización de tratamiento de datos y bloquea bots (honeypot)', async () => {
    const mani = await svc('Manicure')
    const base = { serviceId: mani.id, date: THU, startMin: 15 * 60, name: 'Clienta Prueba', phone: '3105550102' }
    await expectDomainError(db.createPublicBooking({ ...base, consents: { dataTreatment: false, marketing: false } }), 'consentimiento')
    await expectDomainError(db.createPublicBooking({ ...base, consents, honeypot: 'spam' }), 'abuso')
    await expectDomainError(db.createPublicBooking({ ...base, phone: '123', consents }), 'validacion')
  })
})

describe('2. Evitar reserva duplicada o superpuesta', () => {
  it('rechaza un horario ya ocupado para la misma profesional', async () => {
    const acril = await svc('Uñas acrílicas') // 120 min
    await db.createPublicBooking({ serviceId: acril.id, date: THU, startMin: 15 * 60, name: 'Clienta Prueba A', phone: '3105550201', consents })
    const mani = await svc('Manicure')
    await expectDomainError(db.createPublicBooking({ serviceId: mani.id, date: THU, startMin: 16 * 60, name: 'Clienta Prueba B', phone: '3105550202', consents }), 'ocupado')
    // contiguo sí se permite
    await expect(db.createPublicBooking({ serviceId: mani.id, date: THU, startMin: 17 * 60, name: 'Clienta Prueba B', phone: '3105550202', consents })).resolves.toBeTruthy()
  })

  it('rechaza la misma solicitud duplicada de la misma clienta (aunque escriba distinto el número)', async () => {
    const mani = await svc('Manicure')
    await db.createPublicBooking({ serviceId: mani.id, date: THU, startMin: 15 * 60, name: 'Clienta Prueba C', phone: '3105550301', consents })
    await expectDomainError(db.createPublicBooking({ serviceId: mani.id, date: THU, startMin: 17 * 60, name: 'Clienta Prueba C', phone: '+57 310 555 0301', consents }), 'duplicada')
    const data = await db.load()
    expect(data.clients.filter((c) => c.phone === '573105550301')).toHaveLength(1)
  })

  it('limita la cantidad de solicitudes por teléfono por día', async () => {
    const services = (await db.load()).services
    const days = ['2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27']
    for (let i = 0; i < 3; i++) await db.createPublicBooking({ serviceId: services[i].id, date: days[i], startMin: 15 * 60, name: 'Clienta Prueba D', phone: '3105550401', consents })
    await expectDomainError(db.createPublicBooking({ serviceId: services[3].id, date: days[3], startMin: 15 * 60, name: 'Clienta Prueba D', phone: '3105550401', consents }), 'limite')
  })

  it('respeta bloqueos de horario', async () => {
    const mani = await svc('Manicure')
    await db.addBlock({ staffId: DEMO_STAFF_ID, date: THU, startMin: 15 * 60, endMin: 16 * 60, reason: 'Prueba', kind: 'bloqueo' })
    await expectDomainError(db.createPublicBooking({ serviceId: mani.id, date: THU, startMin: 15 * 60, name: 'Clienta Prueba E', phone: '3105550501', consents }), 'bloqueado')
  })
})

describe('3–5. Confirmar, reprogramar y cancelar', () => {
  it('flujo completo de estados de una cita', async () => {
    const mani = await svc('Manicure')
    const a = await db.createPublicBooking({ serviceId: mani.id, date: THU, startMin: 15 * 60, name: 'Clienta Prueba F', phone: '3105550601', consents })
    expect((await db.setAppointmentStatus(a.id, 'confirmada')).status).toBe('confirmada')

    const moved = await db.rescheduleAppointment(a.id, THU, 17 * 60)
    expect(moved.startMin).toBe(17 * 60)
    expect(moved.endMin).toBe(17 * 60 + mani.durationMin)
    // el horario anterior queda libre
    await expect(db.createPublicBooking({ serviceId: mani.id, date: THU, startMin: 15 * 60, name: 'Clienta Prueba G', phone: '3105550602', consents })).resolves.toBeTruthy()
    // no se puede reprogramar encima de otra cita
    await expectDomainError(db.rescheduleAppointment(a.id, THU, 15 * 60), 'ocupado')

    const cancelled = await db.setAppointmentStatus(a.id, 'cancelada')
    expect(cancelled.status).toBe('cancelada')
    await expectDomainError(db.rescheduleAppointment(a.id, THU, 18 * 60), 'estado')
    // una cita cancelada libera el horario
    await expect(db.createPublicBooking({ serviceId: mani.id, date: THU, startMin: 17 * 60, name: 'Clienta Prueba H', phone: '3105550603', consents })).resolves.toBeTruthy()
    const audit = (await db.load()).audit.map((l) => l.action)
    expect(audit).toEqual(expect.arrayContaining(['estado_cita', 'reprogramar_cita']))
  })

  it('completar otorga puntos una vez; cancelar no otorga y revierte', async () => {
    const mani = await svc('Manicure')
    const a = await db.createPublicBooking({ serviceId: mani.id, date: THU, startMin: 15 * 60, name: 'Clienta Prueba I', phone: '3105550701', consents })
    await db.setAppointmentStatus(a.id, 'cancelada')
    expect(clientPoints((await db.load()).loyaltyTx, a.clientId)).toBe(0)
    await db.setAppointmentStatus(a.id, 'confirmada')
    await db.setAppointmentStatus(a.id, 'completada')
    await db.setAppointmentStatus(a.id, 'completada')
    expect(clientPoints((await db.load()).loyaltyTx, a.clientId)).toBe(10)
    await db.setAppointmentStatus(a.id, 'cancelada') // por error, después de completada
    expect(clientPoints((await db.load()).loyaltyTx, a.clientId)).toBe(0)
  })
})

describe('6–7. Registrar clienta y consultar historial', () => {
  it('evita duplicados por teléfono y conserva el historial', async () => {
    const c = await db.upsertClient({ name: 'Clienta Manual', phone: '3105550801', consents: { dataTreatment: true, marketing: true } })
    await expectDomainError(db.upsertClient({ name: 'Otra', phone: '+57 310-555-0801' }), 'duplicada')
    const mani = await svc('Manicure')
    const a = await db.createAppointment({ clientId: c.id, serviceId: mani.id, staffId: DEMO_STAFF_ID, date: THU, startMin: 15 * 60 })
    await db.setAppointmentStatus(a.id, 'completada')
    const st = clientStats(await db.load(), c.id, NOW)
    expect(st.appts).toHaveLength(1)
    expect(st.completed).toHaveLength(1)
    expect(st.servicesDone).toEqual([mani.id])
  })

  it('el cumpleaños solo se guarda con autorización', async () => {
    const c = await db.upsertClient({ name: 'Clienta Cumple', phone: '3105550802', birthday: '05-10', consents: { birthday: false } })
    expect(c.birthday).toBeUndefined()
    const c2 = await db.upsertClient({ name: 'Clienta Cumple', phone: '3105550802', birthday: '05-10', consents: { birthday: true } }, c.id)
    expect(c2.birthday).toBe('05-10')
  })

  it('suprime datos personales conservando cifras anónimas', async () => {
    const data = await db.load()
    const c = data.clients[0]
    await db.anonymizeClient(c.id)
    const after = (await db.load()).clients.find((x) => x.id === c.id)!
    expect(after.name).toBe('Clienta eliminada')
    expect(after.phone).not.toContain('57300')
    expect((await db.load()).appointments.some((a) => a.clientId === c.id)).toBe(true)
  })
})

describe('8. Registrar pago', () => {
  it('registra anticipo y saldo, y no permite pagar de más', async () => {
    const acril = await svc('Uñas acrílicas')
    const c = await db.upsertClient({ name: 'Clienta Pago', phone: '3105550901' })
    const a = await db.createAppointment({ clientId: c.id, serviceId: acril.id, staffId: DEMO_STAFF_ID, date: THU, startMin: 15 * 60 })
    await db.addPayment({ appointmentId: a.id, clientId: c.id, amount: 20000, kind: 'anticipo', method: 'Nequi', paidAt: '2026-11-16', note: '' })
    let ps = paymentState(a, (await db.load()).payments)
    expect(ps).toMatchObject({ state: 'anticipo', paid: 20000, balance: acril.price! - 20000 })
    await expectDomainError(db.addPayment({ appointmentId: a.id, clientId: c.id, amount: acril.price!, kind: 'abono', method: 'Efectivo', paidAt: '2026-11-16', note: '' }), 'validacion')
    await expectDomainError(db.addPayment({ appointmentId: a.id, clientId: c.id, amount: 1000, kind: 'abono', method: 'Bitcoin', paidAt: '2026-11-16', note: '' }), 'validacion')
    await db.addPayment({ appointmentId: a.id, clientId: c.id, amount: acril.price! - 20000, kind: 'abono', method: 'Efectivo', paidAt: '2026-11-16', note: '' })
    ps = paymentState(a, (await db.load()).payments)
    expect(ps.state).toBe('pagado')
  })
})

describe('9. Dashboard con datos reales', () => {
  it('los indicadores reflejan los cambios registrados', async () => {
    const before = dashboardMetrics(await db.load(), NOW)
    const mani = await svc('Manicure')
    const c = await db.upsertClient({ name: 'Clienta Dashboard', phone: '3105551001' })
    const a = await db.createAppointment({ clientId: c.id, serviceId: mani.id, staffId: DEMO_STAFF_ID, date: '2026-11-16', startMin: 11 * 60, status: 'pendiente' })
    let m = dashboardMetrics(await db.load(), NOW)
    expect(m.todays.length).toBe(before.todays.length + 1)
    expect(m.pending.length).toBe(before.pending.length + 1)
    await db.setAppointmentStatus(a.id, 'completada')
    await db.addPayment({ appointmentId: a.id, clientId: c.id, amount: mani.price!, kind: 'pago_total', method: 'Efectivo', paidAt: '2026-11-16', note: '' })
    m = dashboardMetrics(await db.load(), NOW)
    expect(m.completedMonth.length).toBe(before.completedMonth.length + 1)
    expect(m.income.total).toBe(before.income.total + mani.price!)
    expect(m.nextSlots.length).toBeGreaterThan(0)
    // el slot ocupado no aparece como libre
    expect(m.nextSlots.some((s) => s.date === '2026-11-16' && s.slot.startMin === 11 * 60)).toBe(false)
  })
})

describe('Persistencia y reinicio de la demo', () => {
  it('persiste entre instancias y se puede reiniciar', async () => {
    await db.upsertClient({ name: 'Persistente', phone: '3105551101' })
    const again = new DemoAdapter(storage, { now: () => NOW })
    expect((await again.load()).clients.some((c) => c.name === 'Persistente')).toBe(true)
    await again.reset()
    expect((await again.load()).clients.some((c) => c.name === 'Persistente')).toBe(false)
    expect(storage.getItem(DEMO_STORAGE_KEY)).toBeTruthy()
  })
})
