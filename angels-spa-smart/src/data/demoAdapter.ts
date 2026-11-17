// Adaptador de DEMOSTRACIÓN. Guarda todo en el navegador (localStorage).
// ⚠️ localStorage NO es un mecanismo seguro para datos reales de clientas: cualquier
// persona con acceso al dispositivo puede leerlo. Úsese solo con datos ficticios.
import type {
  Appointment,
  AppointmentStatus,
  AvailabilityRule,
  Business,
  Client,
  DataSnapshot,
  GalleryItem,
  LoyaltySettings,
  Payment,
  Promotion,
  ScheduleBlock,
  Service,
  Staff,
} from '../types'
import { checkSlot, UNAVAILABILITY_MSG } from '../lib/availability'
import { loyaltyDeltaForStatus, clientPoints } from '../lib/loyalty'
import { normalizePhone } from '../lib/phone'
import { today } from '../lib/time'
import { uid } from '../lib/id'
import { buildSeed } from './seed'
import type { AdminAppointmentInput, ClientInput, DataAdapter, PublicBookingRequest } from './adapter'
import { DomainError } from './adapter'
import { publicBookingSchema } from './schemas'

export const DEMO_STORAGE_KEY = 'angels-spa-smart:demo:v1'

export interface KVStorage {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
  removeItem(k: string): void
}

export function memoryStorage(): KVStorage {
  const m = new Map<string, string>()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) }
}

export class DemoAdapter implements DataAdapter {
  readonly mode = 'demo' as const
  private data: DataSnapshot
  private clock: () => Date
  private storage: KVStorage

  constructor(storage?: KVStorage, opts: { now?: () => Date; actor?: string } = {}) {
    this.storage = storage ?? (typeof localStorage !== 'undefined' ? localStorage : memoryStorage())
    this.clock = opts.now ?? (() => new Date())
    const raw = this.storage.getItem(DEMO_STORAGE_KEY)
    let parsed: DataSnapshot | null = null
    try {
      parsed = raw ? (JSON.parse(raw) as DataSnapshot) : null
    } catch {
      parsed = null
    }
    this.data = parsed ?? buildSeed(this.clock())
    if (!parsed) this.persist()
  }

  actor = 'admin-demo'

  // ---------- utilidades internas ----------
  private persist() {
    try {
      this.storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(this.data))
    } catch {
      throw new DomainError('almacenamiento', 'No hay espacio suficiente en el navegador. Reduce el tamaño de las imágenes.')
    }
  }
  private nowISO() {
    return this.clock().toISOString()
  }
  private audit(action: string, entity: string, entityId: string | null, detail = '') {
    this.data.audit.unshift({ id: uid(), businessId: this.data.business.id, actor: this.actor, action, entity, entityId, detail, createdAt: this.nowISO() })
    this.data.audit = this.data.audit.slice(0, 500)
  }
  private snapshot(): DataSnapshot {
    return structuredClone(this.data)
  }
  private appt(id: string): Appointment {
    const a = this.data.appointments.find((x) => x.id === id)
    if (!a) throw new DomainError('no_encontrado', 'La cita no existe.')
    return a
  }
  private service(id: string): Service {
    const s = this.data.services.find((x) => x.id === id)
    if (!s) throw new DomainError('no_encontrado', 'El servicio no existe.')
    return s
  }
  private defaultStaff(): Staff {
    const s = this.data.staff.find((x) => x.active)
    if (!s) throw new DomainError('sin_profesional', 'No hay profesionales activas.')
    return s
  }
  private assertSlot(staffId: string, date: string, startMin: number, durationMin: number, admin: boolean, excludeAppointmentId?: string) {
    const reason = checkSlot(
      {
        business: this.data.business,
        rules: this.data.availability,
        blocks: this.data.blocks,
        appointments: this.data.appointments,
        staffId,
        date,
        durationMin,
        now: this.clock(),
        admin,
        excludeAppointmentId,
      },
      startMin,
    )
    if (reason) throw new DomainError(reason, UNAVAILABILITY_MSG[reason])
  }
  private findClientByPhone(phone: string) {
    return this.data.clients.find((c) => c.phone === phone && !c.anonymized)
  }

  async load() {
    return this.snapshot()
  }

  async reset() {
    this.data = buildSeed(this.clock())
    this.persist()
  }

  // ---------- reserva pública ----------
  async createPublicBooking(req: PublicBookingRequest): Promise<Appointment> {
    const parsed = publicBookingSchema.safeParse(req)
    if (!parsed.success) throw new DomainError('validacion', parsed.error.issues[0]?.message ?? 'Datos inválidos.')
    if (req.honeypot) throw new DomainError('abuso', 'No fue posible procesar la solicitud.')
    if (!req.consents.dataTreatment) throw new DomainError('consentimiento', 'Debes autorizar el tratamiento de tus datos para reservar.')
    const phone = normalizePhone(req.phone)
    if (!phone) throw new DomainError('telefono', 'Ingresa un número de celular válido.')
    const service = this.service(req.serviceId)
    if (!service.active) throw new DomainError('servicio_inactivo', 'Este servicio no está disponible para reservas.')
    const staffId = req.staffId ?? this.defaultStaff().id

    const existing = this.findClientByPhone(phone)
    const t = today(this.clock())
    if (existing) {
      const mine = this.data.appointments.filter((a) => a.clientId === existing.id)
      // Reserva duplicada: misma clienta, mismo servicio, mismo día, aún activa
      if (mine.some((a) => a.serviceId === service.id && a.date === req.date && (a.status === 'pendiente' || a.status === 'confirmada')))
        throw new DomainError('duplicada', 'Ya tienes una solicitud para este servicio en esa fecha.')
      // Límite anti-abuso: solicitudes pendientes creadas hoy por el mismo teléfono
      const createdToday = mine.filter((a) => a.source === 'publico' && a.status === 'pendiente' && a.createdAt.slice(0, 10) === this.nowISO().slice(0, 10) && a.date >= t)
      if (createdToday.length >= this.data.business.maxPendingPerPhonePerDay)
        throw new DomainError('limite', 'Alcanzaste el máximo de solicitudes por hoy. Escríbenos por WhatsApp.')
    }

    this.assertSlot(staffId, req.date, req.startMin, service.durationMin, false)

    const now = this.nowISO()
    let client = existing
    if (!client) {
      client = {
        id: uid(),
        businessId: this.data.business.id,
        name: req.name.trim(),
        phone,
        createdAt: now,
        preferences: '',
        notes: '',
        consents: { dataTreatment: true, marketing: req.consents.marketing, birthday: false, updatedAt: now },
      }
      this.data.clients.push(client)
    } else if (req.consents.marketing && !client.consents.marketing) {
      client.consents = { ...client.consents, marketing: true, updatedAt: now }
    }

    const appt: Appointment = {
      id: uid(),
      businessId: this.data.business.id,
      clientId: client.id,
      serviceId: service.id,
      staffId,
      date: req.date,
      startMin: req.startMin,
      endMin: req.startMin + service.durationMin,
      status: 'pendiente',
      price: service.price,
      clientNotes: (req.notes ?? '').trim().slice(0, 500),
      internalNotes: '',
      source: 'publico',
      createdAt: now,
      updatedAt: now,
    }
    this.data.appointments.push(appt)
    this.audit('reserva_publica', 'appointment', appt.id, `${service.name} ${req.date}`)
    this.persist()
    return structuredClone(appt)
  }

  // ---------- citas ----------
  async createAppointment(input: AdminAppointmentInput): Promise<Appointment> {
    const service = this.service(input.serviceId)
    if (!this.data.clients.some((c) => c.id === input.clientId)) throw new DomainError('no_encontrado', 'La clienta no existe.')
    this.assertSlot(input.staffId, input.date, input.startMin, service.durationMin, true)
    const now = this.nowISO()
    const appt: Appointment = {
      id: uid(),
      businessId: this.data.business.id,
      clientId: input.clientId,
      serviceId: service.id,
      staffId: input.staffId,
      date: input.date,
      startMin: input.startMin,
      endMin: input.startMin + service.durationMin,
      status: input.status ?? 'confirmada',
      price: input.price === undefined ? service.price : input.price,
      clientNotes: '',
      internalNotes: input.internalNotes ?? '',
      source: 'admin',
      createdAt: now,
      updatedAt: now,
    }
    this.data.appointments.push(appt)
    this.audit('crear_cita', 'appointment', appt.id, `${service.name} ${input.date}`)
    this.persist()
    return structuredClone(appt)
  }

  async rescheduleAppointment(id: string, date: string, startMin: number, staffId?: string) {
    const a = this.appt(id)
    if (a.status === 'cancelada' || a.status === 'completada') throw new DomainError('estado', 'Solo se pueden reprogramar citas pendientes o confirmadas.')
    const dur = a.endMin - a.startMin
    const sid = staffId ?? a.staffId
    this.assertSlot(sid, date, startMin, dur, true, a.id)
    const before = `${a.date} ${a.startMin}`
    Object.assign(a, { date, startMin, endMin: startMin + dur, staffId: sid, updatedAt: this.nowISO() })
    this.audit('reprogramar_cita', 'appointment', a.id, `${before} → ${date} ${startMin}`)
    this.persist()
    return structuredClone(a)
  }

  async setAppointmentStatus(id: string, status: AppointmentStatus) {
    const a = this.appt(id)
    if (a.status === status) return structuredClone(a)
    if (a.status === 'cancelada' && status !== 'pendiente' && status !== 'confirmada')
      throw new DomainError('estado', 'Una cita cancelada solo puede reactivarse como pendiente o confirmada.')
    if (a.status === 'cancelada') {
      // Reactivar exige que el horario siga libre
      this.assertSlot(a.staffId, a.date, a.startMin, a.endMin - a.startMin, true, a.id)
    }
    const prev = a.status
    a.status = status
    a.updatedAt = this.nowISO()
    const delta = loyaltyDeltaForStatus(this.data.loyalty, this.data.loyaltyTx, a)
    if (delta) {
      this.data.loyaltyTx.push({
        id: uid(),
        businessId: a.businessId,
        clientId: a.clientId,
        appointmentId: a.id,
        points: delta.points,
        kind: delta.kind,
        description: delta.kind === 'acumulacion' ? 'Visita completada' : `Reversión: la cita pasó a ${status}`,
        createdAt: this.nowISO(),
      })
    }
    this.audit('estado_cita', 'appointment', a.id, `${prev} → ${status}`)
    this.persist()
    return structuredClone(a)
  }

  async updateAppointmentNotes(id: string, internalNotes: string) {
    const a = this.appt(id)
    a.internalNotes = internalNotes.slice(0, 2000)
    a.updatedAt = this.nowISO()
    this.audit('nota_cita', 'appointment', a.id)
    this.persist()
    return structuredClone(a)
  }

  // ---------- agenda ----------
  async addBlock(block: Omit<ScheduleBlock, 'id' | 'businessId'>) {
    if (block.endMin <= block.startMin) throw new DomainError('validacion', 'La hora final debe ser posterior a la inicial.')
    const b: ScheduleBlock = { ...block, id: uid(), businessId: this.data.business.id }
    this.data.blocks.push(b)
    this.audit(b.kind === 'descanso' ? 'dia_descanso' : 'bloquear_horario', 'schedule_block', b.id, `${b.date} ${b.reason}`)
    this.persist()
    return structuredClone(b)
  }

  async removeBlock(id: string) {
    this.data.blocks = this.data.blocks.filter((b) => b.id !== id)
    this.audit('quitar_bloqueo', 'schedule_block', id)
    this.persist()
  }

  async saveAvailability(staffId: string, rules: Omit<AvailabilityRule, 'id' | 'businessId' | 'staffId'>[]) {
    for (const r of rules) if (r.endMin <= r.startMin) throw new DomainError('validacion', 'Revisa los horarios: el cierre debe ser posterior a la apertura.')
    this.data.availability = [
      ...this.data.availability.filter((r) => r.staffId !== staffId),
      ...rules.map((r) => ({ ...r, id: uid(), businessId: this.data.business.id, staffId })),
    ]
    this.audit('horario_atencion', 'availability_rules', staffId)
    this.persist()
  }

  async saveStaff(s: Omit<Staff, 'businessId' | 'id'> & { id?: string }) {
    const existing = s.id ? this.data.staff.find((x) => x.id === s.id) : undefined
    if (existing) Object.assign(existing, { name: s.name, active: s.active })
    const staff = existing ?? { id: uid(), businessId: this.data.business.id, name: s.name, active: s.active }
    if (!existing) this.data.staff.push(staff)
    this.audit('guardar_profesional', 'staff', staff.id, staff.name)
    this.persist()
    return structuredClone(staff)
  }

  // ---------- clientas ----------
  async upsertClient(input: ClientInput, id?: string): Promise<Client> {
    const phone = normalizePhone(input.phone)
    if (!phone) throw new DomainError('telefono', 'Ingresa un número de celular válido.')
    if (!input.name.trim()) throw new DomainError('validacion', 'El nombre es obligatorio.')
    const dup = this.findClientByPhone(phone)
    if (dup && dup.id !== id) throw new DomainError('duplicada', `Ya existe una clienta con ese teléfono: ${dup.name}.`)
    const now = this.nowISO()
    let c = id ? this.data.clients.find((x) => x.id === id) : undefined
    if (id && !c) throw new DomainError('no_encontrado', 'La clienta no existe.')
    if (!c) {
      c = {
        id: uid(),
        businessId: this.data.business.id,
        name: input.name.trim(),
        phone,
        createdAt: now,
        preferences: '',
        notes: '',
        consents: { dataTreatment: true, marketing: false, birthday: false, updatedAt: now },
      }
      this.data.clients.push(c)
      this.audit('crear_clienta', 'client', c.id)
    } else {
      this.audit('editar_clienta', 'client', c.id)
    }
    c.name = input.name.trim()
    c.phone = phone
    if (input.birthday !== undefined) c.birthday = input.birthday || undefined
    if (input.preferences !== undefined) c.preferences = input.preferences
    if (input.notes !== undefined) c.notes = input.notes
    if (input.consents) c.consents = { ...c.consents, ...input.consents, updatedAt: now }
    if (!c.consents.birthday) c.birthday = undefined // sin autorización no se conserva
    this.persist()
    return structuredClone(c)
  }

  /** Derecho de supresión: se borran los datos personales, se conservan cifras agregadas. */
  async anonymizeClient(id: string) {
    const c = this.data.clients.find((x) => x.id === id)
    if (!c) throw new DomainError('no_encontrado', 'La clienta no existe.')
    Object.assign(c, {
      name: 'Clienta eliminada',
      phone: `anon-${c.id.slice(0, 8)}`,
      birthday: undefined,
      preferences: '',
      notes: '',
      anonymized: true,
      consents: { dataTreatment: false, marketing: false, birthday: false, updatedAt: this.nowISO() },
    })
    for (const a of this.data.appointments) if (a.clientId === id) a.clientNotes = ''
    this.audit('suprimir_datos_clienta', 'client', id)
    this.persist()
  }

  // ---------- catálogo ----------
  async saveService(s: Omit<Service, 'businessId' | 'id'> & { id?: string }) {
    if (!s.name.trim()) throw new DomainError('validacion', 'El servicio necesita un nombre.')
    if (s.durationMin < 15 || s.durationMin > 480) throw new DomainError('validacion', 'La duración debe estar entre 15 y 480 minutos.')
    if (s.price !== null && s.price < 0) throw new DomainError('validacion', 'El precio no puede ser negativo.')
    const existing = s.id ? this.data.services.find((x) => x.id === s.id) : undefined
    const svc: Service = existing ? Object.assign(existing, s) : { ...s, id: uid(), businessId: this.data.business.id }
    if (!existing) this.data.services.push(svc)
    this.audit('guardar_servicio', 'service', svc.id, svc.name)
    this.persist()
    return structuredClone(svc)
  }

  async saveGalleryItem(g: Omit<GalleryItem, 'businessId' | 'id'> & { id?: string }) {
    const existing = g.id ? this.data.gallery.find((x) => x.id === g.id) : undefined
    const item: GalleryItem = existing ? Object.assign(existing, g) : { ...g, id: uid(), businessId: this.data.business.id }
    if (!existing) this.data.gallery.unshift(item)
    this.audit('guardar_diseno', 'gallery', item.id, item.title)
    this.persist()
    return structuredClone(item)
  }

  async removeGalleryItem(id: string) {
    this.data.gallery = this.data.gallery.filter((g) => g.id !== id)
    this.audit('eliminar_diseno', 'gallery', id)
    this.persist()
  }

  async savePromotion(p: Omit<Promotion, 'businessId' | 'id'> & { id?: string }) {
    if (p.validTo < p.validFrom) throw new DomainError('validacion', 'La fecha final debe ser posterior a la inicial.')
    const existing = p.id ? this.data.promotions.find((x) => x.id === p.id) : undefined
    const promo: Promotion = existing ? Object.assign(existing, p) : { ...p, id: uid(), businessId: this.data.business.id }
    if (!existing) this.data.promotions.unshift(promo)
    this.audit('guardar_promocion', 'promotion', promo.id, promo.title)
    this.persist()
    return structuredClone(promo)
  }

  async removePromotion(id: string) {
    this.data.promotions = this.data.promotions.filter((p) => p.id !== id)
    this.audit('eliminar_promocion', 'promotion', id)
    this.persist()
  }

  // ---------- pagos ----------
  async addPayment(p: Omit<Payment, 'id' | 'businessId' | 'createdAt'>) {
    if (!(p.amount > 0)) throw new DomainError('validacion', 'El valor debe ser mayor que cero.')
    if (!this.data.business.paymentMethods.includes(p.method)) throw new DomainError('validacion', 'Medio de pago no habilitado.')
    if (p.appointmentId) {
      const a = this.appt(p.appointmentId)
      if (a.clientId !== p.clientId) throw new DomainError('validacion', 'El pago no corresponde a la clienta de la cita.')
      if (a.price !== null) {
        const paid = this.data.payments.filter((x) => x.appointmentId === a.id).reduce((s, x) => s + x.amount, 0)
        if (paid + p.amount > a.price) throw new DomainError('validacion', 'El pago supera el saldo pendiente de la cita.')
      }
    }
    const pay: Payment = { ...p, id: uid(), businessId: this.data.business.id, createdAt: this.nowISO() }
    this.data.payments.push(pay)
    this.audit('registrar_pago', 'payment', pay.id, `${p.amount} ${p.method}`)
    this.persist()
    return structuredClone(pay)
  }

  async removePayment(id: string) {
    this.data.payments = this.data.payments.filter((p) => p.id !== id)
    this.audit('anular_pago', 'payment', id)
    this.persist()
  }

  // ---------- fidelización ----------
  async saveLoyaltySettings(s: LoyaltySettings) {
    if (s.pointsPerVisit < 0) throw new DomainError('validacion', 'Los puntos por visita no pueden ser negativos.')
    this.data.loyalty = structuredClone(s)
    this.audit('reglas_fidelizacion', 'loyalty', null)
    this.persist()
  }

  async redeemReward(clientId: string, rewardId: string) {
    const r = this.data.loyalty.rewards.find((x) => x.id === rewardId)
    if (!r) throw new DomainError('no_encontrado', 'El beneficio no existe.')
    const balance = clientPoints(this.data.loyaltyTx, clientId)
    if (balance < r.cost) throw new DomainError('saldo', `Puntos insuficientes: tiene ${balance} y necesita ${r.cost}.`)
    this.data.loyaltyTx.push({ id: uid(), businessId: this.data.business.id, clientId, appointmentId: null, points: -r.cost, kind: 'redencion', description: r.name, createdAt: this.nowISO() })
    this.audit('canjear_puntos', 'loyalty', clientId, r.name)
    this.persist()
  }

  async adjustPoints(clientId: string, points: number, description: string) {
    if (!Number.isInteger(points) || points === 0) throw new DomainError('validacion', 'Indica una cantidad entera distinta de cero.')
    if (clientPoints(this.data.loyaltyTx, clientId) + points < 0) throw new DomainError('saldo', 'El saldo no puede quedar negativo.')
    this.data.loyaltyTx.push({ id: uid(), businessId: this.data.business.id, clientId, appointmentId: null, points, kind: 'ajuste', description: description || 'Ajuste manual', createdAt: this.nowISO() })
    this.audit('ajustar_puntos', 'loyalty', clientId, String(points))
    this.persist()
  }

  // ---------- configuración ----------
  async saveBusiness(b: Partial<Business>) {
    const wa = b.whatsapp !== undefined ? normalizePhone(b.whatsapp) : undefined
    if (b.whatsapp !== undefined && !wa) throw new DomainError('telefono', 'El WhatsApp del negocio no es válido.')
    this.data.business = { ...this.data.business, ...b, ...(wa ? { whatsapp: wa } : {}) }
    this.audit('configuracion', 'business', this.data.business.id)
    this.persist()
  }
}
