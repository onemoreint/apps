import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock4, Lock, Plus, Trash2, Settings2 } from 'lucide-react'
import { useData, useStore } from '../data/store'
import type { Appointment, AvailabilityRule } from '../types'
import { BLOCKING_STATUSES } from '../types'
import { addDays, daysInMonth, formatDateLong, formatTime, hhmmToMin, minToHHMM, monthName, parseDate, startOfMonth, startOfWeek, today, weekday, weekdayName, weekdayShort } from '../lib/time'
import { availableSlots } from '../lib/availability'
import { Alert, Button, Card, Checkbox, EmptyState, Field, Input, Modal, PageHeader, Select, cx, useToast } from '../components/ui'
import { AppointmentDetail, AppointmentModal, AppointmentRow } from './appointments'

type View = 'dia' | 'semana' | 'mes'

export function Agenda() {
  const data = useData()
  const { run } = useStore()
  const toast = useToast()
  const [view, setView] = useState<View>('dia')
  const [ref, setRef] = useState(today())
  const staffList = data.staff.filter((s) => s.active)
  const [staffId, setStaffId] = useState(staffList[0]?.id ?? '')
  const [open, setOpen] = useState<Appointment | null>(null)
  const [create, setCreate] = useState<string | null>(null)
  const [blockOpen, setBlockOpen] = useState(false)
  const [hoursOpen, setHoursOpen] = useState(false)

  const shortest = Math.min(60, ...data.services.filter((s) => s.active).map((s) => s.durationMin))
  const apptsOn = (d: string) => data.appointments.filter((a) => a.date === d && a.staffId === staffId).sort((a, b) => a.startMin - b.startMin)
  const blocksOn = (d: string) => data.blocks.filter((b) => b.date === d && (b.staffId === null || b.staffId === staffId))
  const freeOn = (d: string) => availableSlots({ business: data.business, rules: data.availability, blocks: data.blocks, appointments: data.appointments, staffId, date: d, durationMin: shortest, admin: true }).length
  const openMinutes = (d: string) => data.availability.filter((r) => r.staffId === staffId && r.weekday === weekday(d)).reduce((s, r) => s + (r.endMin - r.startMin), 0)
  const occupancy = (d: string) => {
    const total = openMinutes(d)
    if (!total || blocksOn(d).some((b) => b.kind === 'descanso')) return null
    const busy = apptsOn(d).filter((a) => BLOCKING_STATUSES.includes(a.status)).reduce((s, a) => s + (a.endMin - a.startMin), 0)
    return Math.min(1, busy / total)
  }

  const step = (dir: 1 | -1) => {
    if (view === 'dia') setRef(addDays(ref, dir))
    else if (view === 'semana') setRef(addDays(ref, 7 * dir))
    else {
      const [y, m] = ref.split('-').map(Number)
      const d = new Date(Date.UTC(y, m - 1 + dir, 1))
      setRef(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`)
    }
  }

  const title =
    view === 'dia'
      ? formatDateLong(ref)
      : view === 'semana'
        ? `Semana del ${parseDate(startOfWeek(ref)).getUTCDate()} de ${monthName(parseDate(startOfWeek(ref)).getUTCMonth())}`
        : `${monthName(parseDate(ref).getUTCMonth())} ${parseDate(ref).getUTCFullYear()}`

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Agenda"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setHoursOpen(true)}><Settings2 className="h-4 w-4" /> Horario</Button>
            <Button variant="secondary" size="sm" onClick={() => setBlockOpen(true)}><Lock className="h-4 w-4" /> Bloquear</Button>
            <Button size="sm" onClick={() => setCreate(view === 'dia' ? ref : today())}><Plus className="h-4 w-4" /> Nueva cita</Button>
          </>
        }
      />

      <Card className="mb-5 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-full bg-blush-50 p-1 text-sm" role="tablist" aria-label="Vista">
          {(['dia', 'semana', 'mes'] as View[]).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cx('min-h-[38px] flex-1 rounded-full px-4 capitalize transition sm:flex-none', view === v ? 'bg-white font-medium shadow-sm' : 'text-ink-600')}>
              {v === 'dia' ? 'Día' : v}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => step(-1)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-blush-50" aria-label="Anterior"><ChevronLeft className="h-5 w-5" /></button>
          <span className="min-w-[180px] text-center font-medium first-letter:uppercase">{title}</span>
          <button onClick={() => step(1)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-blush-50" aria-label="Siguiente"><ChevronRight className="h-5 w-5" /></button>
          <Button size="sm" variant="ghost" onClick={() => setRef(today())}>Hoy</Button>
        </div>
        {staffList.length > 1 && (
          <Select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="sm:w-48" aria-label="Profesional">
            {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        )}
      </Card>

      {view === 'dia' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-2">
            {blocksOn(ref).map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-3 text-sm">
                <Lock className="h-4 w-4 text-ink-400" />
                <span className="flex-1">
                  {b.kind === 'descanso' ? 'Día de descanso' : `${formatTime(b.startMin)} – ${formatTime(b.endMin)}`} · {b.reason || 'Sin motivo'}
                </span>
                <button
                  onClick={async () => {
                    const r = await run((a) => a.removeBlock(b.id))
                    toast(r.ok ? 'Bloqueo eliminado' : r.error, r.ok ? 'success' : 'error')
                  }}
                  className="grid h-9 w-9 place-items-center rounded-full text-ink-600 hover:bg-white"
                  aria-label="Quitar bloqueo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {apptsOn(ref).length === 0 ? (
              <EmptyState title="Sin citas este día" text={openMinutes(ref) ? `${freeOn(ref)} horarios libres de ${shortest} min.` : 'No hay horario de atención configurado para este día.'} action={openMinutes(ref) ? <Button size="sm" onClick={() => setCreate(ref)}><Plus className="h-4 w-4" /> Agendar</Button> : undefined} />
            ) : (
              apptsOn(ref).map((a) => <AppointmentRow key={a.id} a={a} onOpen={setOpen} />)
            )}
          </div>
          <Card className="h-fit p-5">
            <p className="text-sm text-ink-400">Resumen del día</p>
            <p className="mt-1 font-display text-2xl font-semibold capitalize">{weekdayName(weekday(ref))}</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex justify-between"><span className="text-ink-600">Horario</span><span>{data.availability.filter((r) => r.staffId === staffId && r.weekday === weekday(ref)).sort((a, b) => a.startMin - b.startMin).map((r) => `${minToHHMM(r.startMin)}–${minToHHMM(r.endMin)}`).join(', ') || 'Cerrado'}</span></li>
              <li className="flex justify-between"><span className="text-ink-600">Citas activas</span><span>{apptsOn(ref).filter((a) => BLOCKING_STATUSES.includes(a.status)).length}</span></li>
              <li className="flex justify-between"><span className="text-ink-600">Horarios libres ({shortest} min)</span><span>{freeOn(ref)}</span></li>
              <li className="flex justify-between"><span className="text-ink-600">Ocupación</span><span>{occupancy(ref) === null ? '—' : `${Math.round(occupancy(ref)! * 100)} %`}</span></li>
            </ul>
          </Card>
        </div>
      )}

      {view === 'semana' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(ref), i)).map((d) => {
            const list = apptsOn(d)
            const occ = occupancy(d)
            return (
              <Card key={d} className={cx('flex flex-col p-3', d === today() && 'ring-2 ring-rose')}>
                <button onClick={() => { setRef(d); setView('dia') }} className="mb-2 text-left">
                  <p className="text-xs uppercase tracking-wider text-ink-400">{weekdayShort(weekday(d))}</p>
                  <p className="font-display text-2xl font-semibold">{parseDate(d).getUTCDate()}</p>
                </button>
                {occ === null ? (
                  <p className="text-xs text-ink-400">{blocksOn(d).some((b) => b.kind === 'descanso') ? 'Descanso' : 'Cerrado'}</p>
                ) : (
                  <>
                    <div className="mb-2 h-1.5 rounded-full bg-blush-50"><div className="h-1.5 rounded-full bg-rose" style={{ width: `${occ * 100}%` }} /></div>
                    <p className="mb-2 text-[11px] text-ink-400">{freeOn(d)} libres</p>
                  </>
                )}
                <div className="space-y-1.5">
                  {list.map((a) => {
                    const c = data.clients.find((x) => x.id === a.clientId)
                    return (
                      <button key={a.id} onClick={() => setOpen(a)} className={cx('w-full rounded-xl px-2 py-1.5 text-left text-xs transition hover:ring-1 hover:ring-rose', a.status === 'pendiente' ? 'bg-champagne-100' : a.status === 'cancelada' ? 'bg-stone-100 line-through opacity-60' : a.status === 'completada' ? 'bg-emerald-50' : a.status === 'no_asistio' ? 'bg-red-50' : 'bg-blush-50')}>
                        <span className="font-semibold">{minToHHMM(a.startMin)}</span> {c?.name.split(' ')[0]}
                      </button>
                    )
                  })}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {view === 'mes' && (
        <Card className="p-3 sm:p-5">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wider text-ink-400">
            {[1, 2, 3, 4, 5, 6, 0].map((w) => <div key={w} className="py-1">{weekdayShort(w)}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {(() => {
              const first = startOfMonth(ref)
              const lead = (weekday(first) + 6) % 7
              const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth(ref) }, (_, i) => addDays(first, i))]
              return cells.map((d, i) => {
                if (!d) return <div key={'e' + i} />
                const occ = occupancy(d)
                const n = apptsOn(d).filter((a) => a.status !== 'cancelada').length
                return (
                  <button
                    key={d}
                    onClick={() => { setRef(d); setView('dia') }}
                    className={cx('flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition hover:ring-2 hover:ring-rose sm:aspect-[4/3]', d === today() && 'ring-2 ring-rose', occ === null ? 'bg-stone-50 text-ink-400' : '')}
                    style={occ !== null ? { backgroundColor: `rgba(232,180,196,${0.12 + occ * 0.75})` } : undefined}
                    aria-label={`${formatDateLong(d)}: ${n} citas${occ !== null ? `, ocupación ${Math.round(occ * 100)} %` : ', cerrado'}`}
                  >
                    <span className="font-semibold">{parseDate(d).getUTCDate()}</span>
                    {n > 0 && <span className="text-[10px] text-ink-600">{n} cita{n > 1 ? 's' : ''}</span>}
                  </button>
                )
              })
            })()}
          </div>
          <div className="mt-4 flex items-center gap-3 text-xs text-ink-400">
            <span>Ocupación:</span>
            <span className="h-3 w-6 rounded" style={{ background: 'rgba(232,180,196,.15)' }} /> baja
            <span className="h-3 w-6 rounded" style={{ background: 'rgba(232,180,196,.85)' }} /> alta
            <span className="h-3 w-6 rounded bg-stone-50 ring-1 ring-stone-200" /> cerrado
          </div>
        </Card>
      )}

      <AppointmentDetail appointment={open} onClose={() => setOpen(null)} />
      <AppointmentModal open={!!create} onClose={() => setCreate(null)} initialDate={create ?? undefined} />
      <BlockModal open={blockOpen} onClose={() => setBlockOpen(false)} staffId={staffId} defaultDate={ref} />
      <HoursModal open={hoursOpen} onClose={() => setHoursOpen(false)} staffId={staffId} />
    </div>
  )
}

function BlockModal({ open, onClose, staffId, defaultDate }: { open: boolean; onClose: () => void; staffId: string; defaultDate: string }) {
  const { run } = useStore()
  const toast = useToast()
  const [date, setDate] = useState(defaultDate)
  const [allDay, setAllDay] = useState(false)
  const [from, setFrom] = useState('09:00')
  const [to, setTo] = useState('11:00')
  const [reason, setReason] = useState('')
  const [salon, setSalon] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (open) {
      setDate(defaultDate)
      setError(null)
    }
  }, [open, defaultDate])
  return (
    <Modal open={open} onClose={onClose} title="Bloquear horario">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          const r = await run((a) =>
            a.addBlock({ staffId: salon ? null : staffId, date, startMin: allDay ? 0 : hhmmToMin(from), endMin: allDay ? 1440 : hhmmToMin(to), reason, kind: allDay ? 'descanso' : 'bloqueo' }),
          )
          if (!r.ok) return setError(r.error)
          toast(allDay ? 'Día de descanso registrado' : 'Horario bloqueado')
          onClose()
        }}
      >
        {error && <Alert>{error}</Alert>}
        <Alert tone="info">Las citas ya agendadas en ese horario no se cancelan automáticamente; revísalas en la agenda.</Alert>
        <Field label="Fecha">{(id) => <Input id={id} type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} required />}</Field>
        <Checkbox checked={allDay} onChange={setAllDay} label="Día completo de descanso" />
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Desde">{(id) => <Input id={id} type="time" step={900} value={from} onChange={(e) => setFrom(e.target.value)} />}</Field>
            <Field label="Hasta">{(id) => <Input id={id} type="time" step={900} value={to} onChange={(e) => setTo(e.target.value)} />}</Field>
          </div>
        )}
        <Field label="Motivo (opcional)">{(id) => <Input id={id} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej. cita médica, capacitación…" />}</Field>
        <Checkbox checked={salon} onChange={setSalon} label="Aplicar a todo el salón (todas las profesionales)" />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  )
}

function HoursModal({ open, onClose, staffId }: { open: boolean; onClose: () => void; staffId: string }) {
  const data = useData()
  const { run } = useStore()
  const toast = useToast()
  const initial = () =>
    [1, 2, 3, 4, 5, 6, 0].map((wd) => {
      const rules = data.availability.filter((r) => r.staffId === staffId && r.weekday === wd).sort((a, b) => a.startMin - b.startMin)
      return { wd, open: rules.length > 0, ranges: rules.length ? rules.map((r) => ({ from: minToHHMM(r.startMin), to: minToHHMM(r.endMin) })) : [{ from: '09:00', to: '18:00' }] }
    })
  const [days, setDays] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (open) setDays(initial())
  }, [open, staffId]) // eslint-disable-line react-hooks/exhaustive-deps

  const upd = (i: number, fn: (d: (typeof days)[number]) => void) => setDays((ds) => ds.map((d, j) => (j === i ? (fn((d = structuredClone(d))), d) : d)))

  return (
    <Modal open={open} onClose={onClose} title="Horario de atención" wide>
      <div className="space-y-3">
        {error && <Alert>{error}</Alert>}
        {days.map((d, i) => (
          <div key={d.wd} className="flex flex-col gap-2 rounded-2xl bg-white p-3 sm:flex-row sm:items-center">
            <div className="w-32"><Checkbox checked={d.open} onChange={(v) => upd(i, (x) => void (x.open = v))} label={<span className="font-medium capitalize text-ink">{weekdayName(d.wd)}</span>} /></div>
            {d.open ? (
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {d.ranges.map((r, k) => (
                  <span key={k} className="flex items-center gap-1">
                    <Input type="time" step={900} value={r.from} onChange={(e) => upd(i, (x) => void (x.ranges[k].from = e.target.value))} className="w-[120px] py-2" aria-label="Apertura" />
                    –
                    <Input type="time" step={900} value={r.to} onChange={(e) => upd(i, (x) => void (x.ranges[k].to = e.target.value))} className="w-[120px] py-2" aria-label="Cierre" />
                    {d.ranges.length > 1 && <button onClick={() => upd(i, (x) => void x.ranges.splice(k, 1))} className="grid h-9 w-9 place-items-center rounded-full hover:bg-blush-50" aria-label="Quitar franja"><Trash2 className="h-4 w-4" /></button>}
                  </span>
                ))}
                {d.ranges.length < 3 && <Button size="sm" variant="ghost" onClick={() => upd(i, (x) => void x.ranges.push({ from: '14:00', to: '18:00' }))}><Clock4 className="h-4 w-4" /> Franja</Button>}
              </div>
            ) : (
              <span className="text-sm text-ink-400">Cerrado</span>
            )}
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={async () => {
              const rules: Omit<AvailabilityRule, 'id' | 'businessId' | 'staffId'>[] = days.flatMap((d) => (d.open ? d.ranges.map((r) => ({ weekday: d.wd, startMin: hhmmToMin(r.from), endMin: hhmmToMin(r.to) })) : []))
              const r = await run((a) => a.saveAvailability(staffId, rules))
              if (!r.ok) return setError(r.error)
              toast('Horario actualizado')
              onClose()
            }}
          >
            Guardar horario
          </Button>
        </div>
      </div>
    </Modal>
  )
}
