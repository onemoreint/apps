import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, CalendarClock, CheckCheck, CircleCheck, Clock, MessageCircle, Phone, UserX, Wallet } from 'lucide-react'
import { useData, useStore } from '../data/store'
import type { Appointment, AppointmentStatus } from '../types'
import { availableSlots } from '../lib/availability'
import { formatDateLong, formatTime, today } from '../lib/time'
import { money } from '../lib/format'
import { buildMessage, waLink, type MessageKind } from '../lib/whatsapp'
import { formatPhone, normalizePhone } from '../lib/phone'
import { paymentState } from '../lib/metrics'
import { Alert, Button, Field, Input, LinkButton, Modal, Select, StatusBadge, Textarea, cx, useToast } from '../components/ui'
import { PaymentModal } from './PaymentModal'

// ---------- Crear / reprogramar ----------
export function AppointmentModal({ open, onClose, appointment, initialDate, initialClientId }: { open: boolean; onClose: () => void; appointment?: Appointment; initialDate?: string; initialClientId?: string }) {
  const data = useData()
  const { run } = useStore()
  const toast = useToast()
  const reschedule = !!appointment
  const activeStaff = data.staff.filter((s) => s.active)
  const services = data.services.filter((s) => s.active || s.id === appointment?.serviceId)

  const [clientMode, setClientMode] = useState<'existente' | 'nueva'>('existente')
  const [clientId, setClientId] = useState(initialClientId ?? '')
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [serviceId, setServiceId] = useState(appointment?.serviceId ?? services[0]?.id ?? '')
  const [staffId, setStaffId] = useState(appointment?.staffId ?? activeStaff[0]?.id ?? '')
  const [date, setDate] = useState(appointment?.date ?? initialDate ?? today())
  const [startMin, setStartMin] = useState<number | ''>('')
  const [notes, setNotes] = useState(appointment?.internalNotes ?? '')
  const [status, setStatus] = useState<AppointmentStatus>('confirmada')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setError(null)
      setStartMin('')
      setDate(appointment?.date ?? initialDate ?? today())
      setClientId(initialClientId ?? appointment?.clientId ?? '')
    }
  }, [open, appointment, initialDate, initialClientId])

  const duration = appointment ? appointment.endMin - appointment.startMin : (data.services.find((s) => s.id === serviceId)?.durationMin ?? 60)
  const slots = useMemo(
    () =>
      staffId
        ? availableSlots({ business: data.business, rules: data.availability, blocks: data.blocks, appointments: data.appointments, staffId, date, durationMin: duration, admin: true, excludeAppointmentId: appointment?.id })
        : [],
    [data, staffId, date, duration, appointment],
  )

  const clients = data.clients.filter((c) => !c.anonymized)
  const q = search.trim().toLowerCase()
  const qDigits = q.replace(/\D/g, '')
  const filtered = clients.filter((c) => !q || c.name.toLowerCase().includes(q) || (qDigits.length >= 3 && c.phone.includes(qDigits))).slice(0, 30)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (startMin === '') return setError('Selecciona un horario disponible.')
    setBusy(true)
    let res
    if (reschedule) {
      res = await run((a) => a.rescheduleAppointment(appointment!.id, date, startMin, staffId))
    } else {
      let cid = clientId
      if (clientMode === 'nueva') {
        if (!normalizePhone(newPhone)) {
          setBusy(false)
          return setError('El celular de la nueva clienta no es válido.')
        }
        const c = await run((a) => a.upsertClient({ name: newName, phone: newPhone, consents: { dataTreatment: true } }))
        if (!c.ok) {
          setBusy(false)
          return setError(c.error)
        }
        cid = c.value.id
      }
      if (!cid) {
        setBusy(false)
        return setError('Selecciona una clienta.')
      }
      res = await run((a) => a.createAppointment({ clientId: cid, serviceId, staffId, date, startMin, internalNotes: notes, status }))
    }
    setBusy(false)
    if (!res.ok) return setError(res.error)
    toast(reschedule ? 'Cita reprogramada' : 'Cita creada')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={reschedule ? 'Reprogramar cita' : 'Nueva cita'}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {!reschedule && (
          <>
            <div className="flex rounded-full bg-blush-50 p-1 text-sm">
              {(['existente', 'nueva'] as const).map((m) => (
                <button type="button" key={m} onClick={() => setClientMode(m)} className={cx('min-h-[38px] flex-1 rounded-full transition', clientMode === m ? 'bg-white font-medium shadow-sm' : 'text-ink-600')}>
                  {m === 'existente' ? 'Clienta registrada' : 'Nueva clienta'}
                </button>
              ))}
            </div>
            {clientMode === 'existente' ? (
              <>
                <Field label="Buscar clienta">{(id) => <Input id={id} placeholder="Nombre o teléfono" value={search} onChange={(e) => setSearch(e.target.value)} />}</Field>
                <Field label="Clienta">
                  {(id) => (
                    <Select id={id} value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                      <option value="">Selecciona…</option>
                      {filtered.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} · {formatPhone(c.phone)}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Nombre">{(id) => <Input id={id} value={newName} onChange={(e) => setNewName(e.target.value)} required />}</Field>
                <Field label="Celular">{(id) => <Input id={id} type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required />}</Field>
              </div>
            )}
            <Field label="Servicio">
              {(id) => (
                <Select id={id} value={serviceId} onChange={(e) => { setServiceId(e.target.value); setStartMin('') }}>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.durationMin} min · {money(s.price)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </>
        )}
        {reschedule && (
          <p className="rounded-2xl bg-blush-50 px-4 py-3 text-sm">
            Actual: <strong className="first-letter:uppercase">{formatDateLong(appointment!.date)}</strong> a las {formatTime(appointment!.startMin)}
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Fecha">{(id) => <Input id={id} type="date" min={today()} value={date} onChange={(e) => { setDate(e.target.value); setStartMin('') }} required />}</Field>
          <Field label="Profesional">
            {(id) => (
              <Select id={id} value={staffId} onChange={(e) => { setStaffId(e.target.value); setStartMin('') }}>
                {activeStaff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Horario disponible</p>
          {slots.length === 0 ? (
            <p className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-ink-600">Sin horarios libres ese día para {duration} min.</p>
          ) : (
            <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {slots.map((s) => (
                <button type="button" key={s.startMin} onClick={() => setStartMin(s.startMin)} className={cx('min-h-[42px] rounded-xl border text-sm transition', startMin === s.startMin ? 'border-rose bg-rose-700 text-white' : 'border-blush-100 bg-white hover:border-rose')}>
                  {formatTime(s.startMin)}
                </button>
              ))}
            </div>
          )}
        </div>
        {!reschedule && (
          <>
            <Field label="Estado inicial">
              {(id) => (
                <Select id={id} value={status} onChange={(e) => setStatus(e.target.value as AppointmentStatus)}>
                  <option value="confirmada">Confirmada</option>
                  <option value="pendiente">Pendiente</option>
                </Select>
              )}
            </Field>
            <Field label="Nota interna (opcional)">{(id) => <Textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
          </>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : reschedule ? 'Reprogramar' : 'Crear cita'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ---------- Detalle y acciones ----------
export function AppointmentDetail({ appointment, onClose }: { appointment: Appointment | null; onClose: () => void }) {
  const data = useData()
  const { run } = useStore()
  const toast = useToast()
  const [notes, setNotes] = useState('')
  const [resched, setResched] = useState(false)
  const [pay, setPay] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const current = appointment ? data.appointments.find((a) => a.id === appointment.id) ?? appointment : null

  useEffect(() => {
    setNotes(current?.internalNotes ?? '')
    setConfirmCancel(false)
  }, [current?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null
  const client = data.clients.find((c) => c.id === current.clientId)
  const service = data.services.find((s) => s.id === current.serviceId)
  const staff = data.staff.find((s) => s.id === current.staffId)
  const ps = paymentState(current, data.payments)
  const isOpen = current.status === 'pendiente' || current.status === 'confirmada'

  async function setStatus(s: AppointmentStatus, msg: string) {
    const r = await run((a) => a.setAppointmentStatus(current!.id, s))
    toast(r.ok ? msg : r.error, r.ok ? 'success' : 'error')
    setConfirmCancel(false)
  }

  const wa = (kind: MessageKind) =>
    client && !client.anonymized
      ? waLink(client.phone, buildMessage(kind, { businessName: data.business.name, clientName: client.name, serviceName: service?.name, date: current.date, startMin: current.startMin, price: current.price, address: data.business.address }))
      : '#'

  return (
    <>
      <Modal open={!!appointment && !resched && !pay} onClose={onClose} title="Detalle de la cita" wide>
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-3xl bg-white p-4">
            <div>
              <p className="font-display text-2xl font-semibold">{service?.name ?? 'Servicio eliminado'}</p>
              <p className="text-sm text-ink-600 first-letter:uppercase">
                {formatDateLong(current.date)} · {formatTime(current.startMin)} – {formatTime(current.endMin)}
              </p>
              <p className="mt-1 text-sm text-ink-600">Profesional: {staff?.name ?? '—'}</p>
            </div>
            <StatusBadge status={current.status} />
          </div>

          {client && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-4">
              <div>
                <p className="font-medium">{client.name}</p>
                <p className="flex items-center gap-1 text-sm text-ink-600">
                  <Phone className="h-3.5 w-3.5" /> {client.anonymized ? '—' : formatPhone(client.phone)}
                </p>
                {current.clientNotes && <p className="mt-1 text-sm text-ink-600">“{current.clientNotes}”</p>}
              </div>
              <Link to={`/admin/clientas?id=${client.id}`} onClick={onClose} className="text-sm font-medium text-rose-800 hover:underline">
                Ver ficha →
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 rounded-3xl bg-white p-4 text-sm sm:grid-cols-3">
            <div><p className="text-ink-400">Precio</p><p className="font-semibold">{money(current.price)}</p></div>
            <div><p className="text-ink-400">Pagado</p><p className="font-semibold">{money(ps.paid)}</p></div>
            <div><p className="text-ink-400">Saldo</p><p className="font-semibold text-rose-800">{ps.balance === null ? '—' : money(ps.balance)}</p></div>
          </div>

          {/* Acciones de estado */}
          <div className="flex flex-wrap gap-2">
            {current.status === 'pendiente' && <Button size="sm" onClick={() => setStatus('confirmada', 'Cita confirmada')}><CheckCheck className="h-4 w-4" /> Confirmar</Button>}
            {isOpen && <Button size="sm" variant="secondary" onClick={() => setStatus('completada', 'Servicio completado')}><CircleCheck className="h-4 w-4" /> Marcar completada</Button>}
            {isOpen && <Button size="sm" variant="secondary" onClick={() => setResched(true)}><CalendarClock className="h-4 w-4" /> Reprogramar</Button>}
            {isOpen && <Button size="sm" variant="secondary" onClick={() => setStatus('no_asistio', 'Marcada como no asistió')}><UserX className="h-4 w-4" /> No asistió</Button>}
            {current.status !== 'cancelada' && ps.balance !== 0 && <Button size="sm" variant="secondary" onClick={() => setPay(true)}><Wallet className="h-4 w-4" /> Registrar pago</Button>}
            {isOpen && !confirmCancel && <Button size="sm" variant="danger" onClick={() => setConfirmCancel(true)}><Ban className="h-4 w-4" /> Cancelar cita</Button>}
            {confirmCancel && (
              <span className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-sm text-red-800">
                ¿Cancelar?
                <Button size="sm" variant="danger" onClick={() => setStatus('cancelada', 'Cita cancelada')}>Sí, cancelar</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(false)}>No</Button>
              </span>
            )}
            {(current.status === 'cancelada' || current.status === 'no_asistio') && <Button size="sm" variant="secondary" onClick={() => setStatus('pendiente', 'Cita reactivada como pendiente')}>Reactivar</Button>}
            {current.status === 'completada' && <Button size="sm" variant="ghost" onClick={() => setStatus('confirmada', 'Completado deshecho')}>Deshacer completado</Button>}
          </div>

          {/* WhatsApp */}
          {client && !client.anonymized && (
            <div className="rounded-3xl bg-white p-4">
              <p className="mb-1 flex items-center gap-1.5 text-sm font-medium"><MessageCircle className="h-4 w-4 text-[#1F8F4E]" /> Mensajes preparados</p>
              <p className="mb-3 text-xs text-ink-400">Se abre WhatsApp con el texto listo; tú decides si lo envías. Nada se envía automáticamente.</p>
              <div className="flex flex-wrap gap-2">
                {current.status !== 'cancelada' && <LinkButton size="sm" variant="secondary" external href={wa('confirmacion')}>Confirmación</LinkButton>}
                {isOpen && <LinkButton size="sm" variant="secondary" external href={wa('recordatorio')}>Recordatorio</LinkButton>}
                {isOpen && <LinkButton size="sm" variant="secondary" external href={wa('reprogramacion')}>Reprogramación</LinkButton>}
                {current.status === 'cancelada' && <LinkButton size="sm" variant="secondary" external href={wa('cancelacion')}>Cancelación</LinkButton>}
              </div>
            </div>
          )}

          <Field label="Notas internas" hint="Solo visibles para el equipo.">
            {(id, d) => <Textarea id={id} aria-describedby={d} value={notes} onChange={(e) => setNotes(e.target.value)} />}
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
            <Button
              disabled={notes === current.internalNotes}
              onClick={async () => {
                const r = await run((a) => a.updateAppointmentNotes(current.id, notes))
                toast(r.ok ? 'Nota guardada' : r.error, r.ok ? 'success' : 'error')
              }}
            >
              Guardar nota
            </Button>
          </div>
        </div>
      </Modal>
      <AppointmentModal open={resched} onClose={() => setResched(false)} appointment={current} />
      <PaymentModal open={pay} onClose={() => setPay(false)} appointmentId={current.id} />
    </>
  )
}

// ---------- Tarjeta de cita ----------
export function AppointmentRow({ a, onOpen, showDate }: { a: Appointment; onOpen: (a: Appointment) => void; showDate?: boolean }) {
  const data = useData()
  const client = data.clients.find((c) => c.id === a.clientId)
  const service = data.services.find((s) => s.id === a.serviceId)
  return (
    <button onClick={() => onOpen(a)} className={cx('flex w-full items-center gap-3 rounded-2xl border border-blush-100 bg-white p-3 text-left transition hover:border-rose hover:shadow-soft', a.status === 'cancelada' && 'opacity-60')}>
      <div className="w-16 shrink-0 text-center">
        <p className="font-display text-lg font-semibold leading-tight">{formatTime(a.startMin).replace(/ (a|p)\. m\./, '')}</p>
        <p className="text-[11px] text-ink-400">{a.startMin < 720 ? 'a. m.' : 'p. m.'}</p>
      </div>
      <span className={cx('h-10 w-1 shrink-0 rounded-full', a.status === 'pendiente' ? 'bg-champagne' : a.status === 'completada' ? 'bg-emerald-400' : a.status === 'cancelada' ? 'bg-stone-300' : a.status === 'no_asistio' ? 'bg-red-300' : 'bg-rose')} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{client?.name ?? '—'}</p>
        <p className="truncate text-sm text-ink-600">
          {service?.name}
          {showDate && <span> · {formatDateLong(a.date)}</span>}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <StatusBadge status={a.status} />
        <span className="flex items-center gap-1 text-[11px] text-ink-400"><Clock className="h-3 w-3" />{a.endMin - a.startMin} min</span>
      </div>
    </button>
  )
}
