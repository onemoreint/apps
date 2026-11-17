// Datos 100 % ficticios para el modo demostración.
// Precios, horarios, nombres y teléfonos son de ejemplo: NO corresponden a Angels Spa
// ni a clientas reales. Los precios definitivos los define el salón desde el panel.
import type { Appointment, AppointmentStatus, DataSnapshot, Payment } from '../types'
import { addDays, today } from '../lib/time'

export const DEMO_BUSINESS_ID = '00000000-0000-4000-8000-000000000001'
export const DEMO_STAFF_ID = '00000000-0000-4000-8000-000000000010'

const S = {
  mani: '00000000-0000-4000-8000-000000000101',
  pedi: '00000000-0000-4000-8000-000000000102',
  acril: '00000000-0000-4000-8000-000000000103',
  semi: '00000000-0000-4000-8000-000000000104',
}

const clientsSeed = [
  ['Valentina Demo Ríos', '573000000001', 'Tonos nude y francés clásico', '03-14'],
  ['Camila Prueba Gómez', '573000000002', 'Le encantan los diseños con brillos', ''],
  ['Mariana Ejemplo Toro', '573000000003', 'Uñas cortas, colores pastel', '11-28'],
  ['Laura Ficticia Mejía', '573000000004', 'Acrílicas almendradas', ''],
  ['Sofía Muestra Henao', '573000000005', '', ''],
  ['Isabella Demo Zapata', '573000000006', 'Prefiere citas en la tarde', ''],
] as const

export function buildSeed(now: Date = new Date()): DataSnapshot {
  const t = today(now)
  const iso = now.toISOString()
  const B = DEMO_BUSINESS_ID

  const clients = clientsSeed.map(([name, phone, pref, bday], i) => ({
    id: `00000000-0000-4000-8000-0000000002${String(i + 1).padStart(2, '0')}`,
    businessId: B,
    name,
    phone,
    createdAt: addDays(t, -60 + i * 5) + 'T15:00:00.000Z',
    birthday: bday || undefined,
    preferences: pref,
    notes: i === 0 ? 'Clienta ficticia de prueba.' : '',
    consents: { dataTreatment: true, marketing: i % 2 === 0, birthday: !!bday, updatedAt: iso },
  }))

  const prices: Record<string, number> = { [S.mani]: 25000, [S.pedi]: 30000, [S.acril]: 80000, [S.semi]: 45000 }
  const durations: Record<string, number> = { [S.mani]: 60, [S.pedi]: 60, [S.acril]: 120, [S.semi]: 90 }

  // [díasRelativos, horaInicio, clienta, servicio, estado, pago]
  const plan: [number, number, number, string, AppointmentStatus, 'total' | 'anticipo' | null][] = [
    [-21, 9 * 60, 0, S.semi, 'completada', 'total'],
    [-20, 15 * 60, 1, S.acril, 'completada', 'total'],
    [-14, 10 * 60, 0, S.mani, 'completada', 'total'],
    [-13, 14 * 60, 2, S.pedi, 'completada', 'total'],
    [-10, 9 * 60, 3, S.acril, 'cancelada', null],
    [-7, 11 * 60, 1, S.semi, 'completada', 'total'],
    [-6, 16 * 60, 4, S.mani, 'no_asistio', null],
    [-3, 9 * 60, 0, S.pedi, 'completada', 'total'],
    [-2, 14 * 60, 5, S.acril, 'completada', 'anticipo'],
    [-1, 10 * 60, 2, S.semi, 'completada', 'total'],
    [0, 15 * 60, 3, S.acril, 'confirmada', 'anticipo'],
    [0, 17 * 60, 4, S.mani, 'pendiente', null],
    [1, 9 * 60, 1, S.pedi, 'confirmada', null],
    [2, 14 * 60, 5, S.semi, 'pendiente', null],
    [4, 10 * 60, 0, S.acril, 'confirmada', 'anticipo'],
    [6, 15 * 60, 2, S.mani, 'pendiente', null],
  ]

  const appointments: Appointment[] = []
  const payments: Payment[] = []
  const methods = ['Nequi', 'Efectivo', 'Transferencia', 'Daviplata']
  plan.forEach(([d, start, ci, sid, status, pay], i) => {
    let date = addDays(t, d)
    // Evitar domingos (día de descanso en el horario demo)
    if (new Date(date + 'T12:00:00Z').getUTCDay() === 0) date = addDays(date, d >= 0 ? 1 : -1)
    const id = `00000000-0000-4000-8000-0000000003${String(i + 1).padStart(2, '0')}`
    const clientId = clients[ci].id
    appointments.push({
      id,
      businessId: B,
      clientId,
      serviceId: sid,
      staffId: DEMO_STAFF_ID,
      date,
      startMin: start,
      endMin: start + durations[sid],
      status,
      price: prices[sid],
      clientNotes: '',
      internalNotes: '',
      source: i % 3 === 0 ? 'admin' : 'publico',
      createdAt: iso,
      updatedAt: iso,
    })
    if (pay) {
      const amount = pay === 'total' ? prices[sid] : Math.round(prices[sid] * 0.3)
      payments.push({
        id: `00000000-0000-4000-8000-0000000004${String(i + 1).padStart(2, '0')}`,
        businessId: B,
        appointmentId: id,
        clientId,
        amount,
        kind: pay === 'total' ? 'pago_total' : 'anticipo',
        method: methods[i % methods.length],
        paidAt: d <= 0 ? date : t,
        note: '',
        createdAt: iso,
      })
    }
  })

  const loyaltyTx = appointments
    .filter((a) => a.status === 'completada')
    .map((a, i) => ({
      id: `00000000-0000-4000-8000-0000000005${String(i + 1).padStart(2, '0')}`,
      businessId: B,
      clientId: a.clientId,
      appointmentId: a.id,
      points: 10,
      kind: 'acumulacion' as const,
      description: 'Visita completada',
      createdAt: iso,
    }))

  const weekdays = [1, 2, 3, 4, 5, 6]
  const availability = weekdays.flatMap((wd) => [
    { id: `rule-${wd}-am`, businessId: B, staffId: DEMO_STAFF_ID, weekday: wd, startMin: 9 * 60, endMin: 13 * 60 },
    { id: `rule-${wd}-pm`, businessId: B, staffId: DEMO_STAFF_ID, weekday: wd, startMin: 14 * 60, endMin: wd === 6 ? 17 * 60 : 19 * 60 },
  ])

  return {
    business: {
      id: B,
      name: 'Angels Spa',
      city: 'Girardota, Antioquia',
      address: 'Calle 10 #17-26, Girardota, Antioquia, Colombia',
      whatsapp: '573017298948',
      instagram: 'angels_spa15',
      welcome: 'Cuidado y belleza para tus manos y pies, con detalle de boutique.',
      slotStepMin: 30,
      minLeadMin: 60,
      maxDaysAhead: 45,
      maxPendingPerPhonePerDay: 3,
      paymentMethods: ['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Otro'],
    },
    staff: [{ id: DEMO_STAFF_ID, businessId: B, name: 'Profesional principal', active: true }],
    services: [
      { id: S.mani, businessId: B, name: 'Manicure', description: 'Limpieza, forma, cutícula y esmaltado tradicional.', durationMin: 60, price: prices[S.mani], active: true, order: 1, tone: 0 },
      { id: S.pedi, businessId: B, name: 'Pedicure', description: 'Cuidado completo de pies, exfoliación y esmaltado.', durationMin: 60, price: prices[S.pedi], active: true, order: 2, tone: 1 },
      { id: S.acril, businessId: B, name: 'Uñas acrílicas', description: 'Extensión en acrílico con forma y largo a tu gusto.', durationMin: 120, price: prices[S.acril], active: true, order: 3, tone: 2 },
      { id: S.semi, businessId: B, name: 'Uñas semipermanentes', description: 'Esmaltado semipermanente de larga duración y brillo intenso.', durationMin: 90, price: prices[S.semi], active: true, order: 4, tone: 3 },
    ],
    clients,
    appointments,
    availability,
    blocks: [
      { id: 'block-demo-1', businessId: B, staffId: DEMO_STAFF_ID, date: addDays(t, 3), startMin: 9 * 60, endMin: 11 * 60, reason: 'Capacitación (demo)', kind: 'bloqueo' },
    ],
    payments,
    loyalty: {
      enabled: true,
      pointsPerVisit: 10,
      rewards: [
        { id: 'rw-1', name: 'Decoración en 2 uñas', cost: 30 },
        { id: 'rw-2', name: '10 % en tu próximo servicio', cost: 60 },
        { id: 'rw-3', name: 'Manicure de cortesía', cost: 120 },
      ],
    },
    loyaltyTx,
    promotions: [
      { id: 'promo-1', businessId: B, title: 'Mani + Pedi de temporada', description: 'Ejemplo de promoción: agenda ambos servicios el mismo día y recibe un detalle especial.', validFrom: addDays(t, -5), validTo: addDays(t, 25), active: true, serviceId: null },
      { id: 'promo-2', businessId: B, title: 'Trae a una amiga', description: 'Ejemplo: si tu amiga reserva por primera vez, ambas suman puntos extra.', validFrom: addDays(t, -2), validTo: addDays(t, 40), active: true, serviceId: null },
    ],
    gallery: [
      ['Francés clásico', 'Semipermanente', 0],
      ['Nude con lazos', 'Acrílicas', 1],
      ['Brillos dorados', 'Acrílicas', 2],
      ['Pastel primavera', 'Semipermanente', 3],
      ['Flores blancas', 'Diseños', 4],
      ['Rosa empolvado', 'Manicure', 5],
    ].map(([title, category, tone], i) => ({ id: `gal-${i + 1}`, businessId: B, title: title as string, category: category as string, tone: tone as number, demo: true })),
    audit: [],
  }
}
