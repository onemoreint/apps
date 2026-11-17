// Tipos de dominio de Angels Spa Smart.
// Fechas de calendario: 'YYYY-MM-DD' en hora local del negocio (America/Bogota).
// Horas: minutos desde la medianoche (0–1440). En producción se guardan como timestamptz.

export type ID = string

export type AppointmentStatus = 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'no_asistio'

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
  no_asistio: 'No asistió',
}

/** Estados que ocupan la agenda (bloquean el horario). */
export const BLOCKING_STATUSES: AppointmentStatus[] = ['pendiente', 'confirmada', 'completada']

export interface Business {
  id: ID
  name: string
  city: string
  address: string
  whatsapp: string // E.164 sin '+', ej. 573017298948
  instagram: string
  welcome: string
  slotStepMin: number
  minLeadMin: number // anticipación mínima para reservas públicas
  maxDaysAhead: number
  maxPendingPerPhonePerDay: number
  paymentMethods: string[]
}

export interface Staff {
  id: ID
  businessId: ID
  name: string
  active: boolean
}

export interface Service {
  id: ID
  businessId: ID
  name: string
  description: string
  durationMin: number
  /** null = precio por confirmar (no se inventan precios definitivos). */
  price: number | null
  active: boolean
  order: number
  tone: number // índice de degradado para la imagen demostrativa
  imageDataUrl?: string
}

export interface ClientConsents {
  dataTreatment: boolean // autorización de tratamiento de datos (Ley 1581 de 2012)
  marketing: boolean // mensajes promocionales
  birthday: boolean // uso de la fecha de cumpleaños
  updatedAt: string
}

export interface Client {
  id: ID
  businessId: ID
  name: string
  phone: string // normalizado E.164 sin '+'
  createdAt: string
  birthday?: string // 'MM-DD'
  preferences: string
  notes: string // observaciones internas
  consents: ClientConsents
  anonymized?: boolean
}

export interface Appointment {
  id: ID
  businessId: ID
  clientId: ID
  serviceId: ID
  staffId: ID
  date: string
  startMin: number
  endMin: number
  status: AppointmentStatus
  price: number | null // precio pactado (copia del servicio al reservar)
  clientNotes: string
  internalNotes: string
  source: 'publico' | 'admin'
  createdAt: string
  updatedAt: string
}

export interface AvailabilityRule {
  id: ID
  businessId: ID
  staffId: ID
  weekday: number // 0=domingo … 6=sábado
  startMin: number
  endMin: number
}

export interface ScheduleBlock {
  id: ID
  businessId: ID
  staffId: ID | null // null = aplica a todo el salón
  date: string
  startMin: number
  endMin: number
  reason: string
  kind: 'bloqueo' | 'descanso'
}

export type PaymentKind = 'anticipo' | 'abono' | 'pago_total'

export interface Payment {
  id: ID
  businessId: ID
  appointmentId: ID | null
  clientId: ID
  amount: number
  kind: PaymentKind
  method: string
  paidAt: string // YYYY-MM-DD
  note: string
  createdAt: string
}

export interface LoyaltySettings {
  enabled: boolean
  pointsPerVisit: number
  rewards: { id: ID; name: string; cost: number }[]
}

export interface LoyaltyTransaction {
  id: ID
  businessId: ID
  clientId: ID
  appointmentId: ID | null
  points: number // positivo = acumulación, negativo = redención/reversión
  kind: 'acumulacion' | 'redencion' | 'reversion' | 'ajuste'
  description: string
  createdAt: string
}

export interface Promotion {
  id: ID
  businessId: ID
  title: string
  description: string
  validFrom: string
  validTo: string
  active: boolean
  serviceId: ID | null
}

export interface GalleryItem {
  id: ID
  businessId: ID
  title: string
  category: string
  tone: number
  imageDataUrl?: string
  demo: boolean
}

export interface AuditLog {
  id: ID
  businessId: ID
  actor: string
  action: string
  entity: string
  entityId: ID | null
  detail: string
  createdAt: string
}

export interface DataSnapshot {
  business: Business
  staff: Staff[]
  services: Service[]
  clients: Client[]
  appointments: Appointment[]
  availability: AvailabilityRule[]
  blocks: ScheduleBlock[]
  payments: Payment[]
  loyalty: LoyaltySettings
  loyaltyTx: LoyaltyTransaction[]
  promotions: Promotion[]
  gallery: GalleryItem[]
  audit: AuditLog[]
}
