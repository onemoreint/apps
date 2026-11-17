import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, CalendarCheck, CalendarClock, CircleCheck, Crown, Hourglass, Plus, Sparkles, Wallet } from 'lucide-react'
import { useData } from '../data/store'
import { dashboardMetrics } from '../lib/metrics'
import { formatDateLong, formatTime, monthName, parseDate } from '../lib/time'
import { money } from '../lib/format'
import { Button, Card, EmptyState, PageHeader, Stat } from '../components/ui'
import type { Appointment } from '../types'
import { AppointmentDetail, AppointmentModal, AppointmentRow } from './appointments'

export function Dashboard() {
  const data = useData()
  const m = useMemo(() => dashboardMetrics(data), [data])
  const [open, setOpen] = useState<Appointment | null>(null)
  const [create, setCreate] = useState(false)
  const month = monthName(parseDate(m.today).getUTCMonth())
  const maxTop = Math.max(1, ...m.topServices.map((t) => t.count))

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Hola, Angels ✨"
        subtitle={`Hoy es ${formatDateLong(m.today)}. Indicadores calculados con los datos registrados en la app.`}
        actions={<Button onClick={() => setCreate(true)}><Plus className="h-4 w-4" /> Nueva cita</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        <Stat label="Citas hoy" value={m.todays.length} icon={CalendarCheck} />
        <Stat label="Por confirmar" value={m.pending.length} icon={Hourglass} hint="Pendientes desde hoy" />
        <Stat label="Completadas" value={m.completedMonth.length} icon={CircleCheck} hint={`En ${month}`} />
        <Stat label="Canceladas" value={m.cancelledMonth.length} icon={Ban} hint={`En ${month}`} />
        <div className="col-span-2 xl:col-span-1">
          <Stat label="Ingresos" value={money(m.income.total)} icon={Wallet} hint={`Registrados en ${month}`} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">Agenda de hoy</h2>
            <Link to="/admin/agenda" className="text-sm font-medium text-rose-800 hover:underline">Ver agenda →</Link>
          </div>
          {m.todays.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="Sin citas para hoy" text="Un buen momento para compartir una promoción o confirmar las pendientes." />
          ) : (
            <div className="space-y-2">{m.todays.map((a) => <AppointmentRow key={a.id} a={a} onOpen={setOpen} />)}</div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-display text-2xl font-semibold">Pendientes de confirmar</h2>
          {m.pending.length === 0 ? (
            <p className="text-sm text-ink-600">Todo al día. 🎉</p>
          ) : (
            <div className="space-y-2">{m.pending.slice(0, 6).map((a) => <AppointmentRow key={a.id} a={a} onOpen={setOpen} showDate />)}</div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-semibold"><Sparkles className="h-5 w-5 text-champagne-700" /> Servicios más solicitados</h2>
          {m.topServices.length === 0 ? (
            <p className="text-sm text-ink-600">Aún no hay citas registradas.</p>
          ) : (
            <ul className="space-y-3">
              {m.topServices.map(({ service, count }) => (
                <li key={service!.id}>
                  <div className="mb-1 flex justify-between text-sm"><span>{service!.name}</span><span className="font-medium">{count}</span></div>
                  <div className="h-2 rounded-full bg-blush-50"><div className="h-2 rounded-full bg-gradient-to-r from-blush to-rose" style={{ width: `${(count / maxTop) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-ink-400">Citas no canceladas, histórico completo.</p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-semibold"><Crown className="h-5 w-5 text-champagne-700" /> Clientas recurrentes</h2>
          {m.recurring.length === 0 ? (
            <p className="text-sm text-ink-600">Aparecerán aquí las clientas con 2 o más visitas completadas.</p>
          ) : (
            <ul className="divide-y divide-blush-100">
              {m.recurring.slice(0, 5).map(({ client, visits }) => (
                <li key={client!.id} className="flex items-center justify-between py-2.5 text-sm">
                  <Link to={`/admin/clientas?id=${client!.id}`} className="hover:text-rose-800">{client!.name}</Link>
                  <span className="text-ink-400">{visits} visitas</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-semibold"><CalendarClock className="h-5 w-5 text-champagne-700" /> Próximos horarios libres</h2>
          {m.nextSlots.length === 0 ? (
            <p className="text-sm text-ink-600">No hay horarios libres en los próximos 14 días.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {m.nextSlots.map(({ date, slot }) => (
                <li key={date + slot.startMin} className="flex items-center justify-between rounded-xl bg-blush-50 px-3 py-2">
                  <span className="first-letter:uppercase">{formatDateLong(date)}</span>
                  <span className="font-medium">{formatTime(slot.startMin)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-ink-400">Calculado para servicios de {m.shortest} min.</p>
        </Card>
      </div>

      <AppointmentDetail appointment={open} onClose={() => setOpen(null)} />
      <AppointmentModal open={create} onClose={() => setCreate(false)} />
    </div>
  )
}
