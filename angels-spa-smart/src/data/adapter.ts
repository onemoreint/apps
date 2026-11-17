// Contrato de datos. La UI solo habla con esta interfaz, de modo que el modo
// demostración (localStorage) y el de producción (Supabase) son intercambiables.
import type {
  Appointment,
  AppointmentStatus,
  AvailabilityRule,
  Business,
  Client,
  ClientConsents,
  DataSnapshot,
  GalleryItem,
  LoyaltySettings,
  Payment,
  Promotion,
  ScheduleBlock,
  Service,
  Staff,
} from '../types'

export class DomainError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'DomainError'
  }
}

export interface PublicBookingRequest {
  serviceId: string
  staffId?: string
  date: string
  startMin: number
  name: string
  phone: string
  notes?: string
  consents: { dataTreatment: boolean; marketing: boolean }
  /** Campo trampa anti-bots: debe llegar vacío. */
  honeypot?: string
}

export interface AdminAppointmentInput {
  clientId: string
  serviceId: string
  staffId: string
  date: string
  startMin: number
  internalNotes?: string
  price?: number | null
  status?: AppointmentStatus
}

export interface ClientInput {
  name: string
  phone: string
  birthday?: string
  preferences?: string
  notes?: string
  consents?: Partial<Omit<ClientConsents, 'updatedAt'>>
}

export interface DataAdapter {
  readonly mode: 'demo' | 'production'
  load(): Promise<DataSnapshot>

  // Público
  createPublicBooking(req: PublicBookingRequest): Promise<Appointment>

  // Citas (admin)
  createAppointment(input: AdminAppointmentInput): Promise<Appointment>
  rescheduleAppointment(id: string, date: string, startMin: number, staffId?: string): Promise<Appointment>
  setAppointmentStatus(id: string, status: AppointmentStatus): Promise<Appointment>
  updateAppointmentNotes(id: string, internalNotes: string): Promise<Appointment>

  // Agenda
  addBlock(block: Omit<ScheduleBlock, 'id' | 'businessId'>): Promise<ScheduleBlock>
  removeBlock(id: string): Promise<void>
  saveAvailability(staffId: string, rules: Omit<AvailabilityRule, 'id' | 'businessId' | 'staffId'>[]): Promise<void>
  saveStaff(staff: Omit<Staff, 'businessId' | 'id'> & { id?: string }): Promise<Staff>

  // Clientas
  upsertClient(input: ClientInput, id?: string): Promise<Client>
  anonymizeClient(id: string): Promise<void>

  // Catálogo
  saveService(s: Omit<Service, 'businessId' | 'id'> & { id?: string }): Promise<Service>
  saveGalleryItem(g: Omit<GalleryItem, 'businessId' | 'id'> & { id?: string }): Promise<GalleryItem>
  removeGalleryItem(id: string): Promise<void>
  savePromotion(p: Omit<Promotion, 'businessId' | 'id'> & { id?: string }): Promise<Promotion>
  removePromotion(id: string): Promise<void>

  // Pagos (registros manuales; no se procesan pagos reales)
  addPayment(p: Omit<Payment, 'id' | 'businessId' | 'createdAt'>): Promise<Payment>
  removePayment(id: string): Promise<void>

  // Fidelización
  saveLoyaltySettings(s: LoyaltySettings): Promise<void>
  redeemReward(clientId: string, rewardId: string): Promise<void>
  adjustPoints(clientId: string, points: number, description: string): Promise<void>

  // Configuración
  saveBusiness(b: Partial<Business>): Promise<void>
  reset?(): Promise<void>
}
