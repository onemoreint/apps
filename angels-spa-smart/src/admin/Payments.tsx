import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Plus, Trash2, Wallet } from 'lucide-react'
import { useData, useStore } from '../data/store'
import { incomeReport, paymentState, periodRange, type Period } from '../lib/metrics'
import { addDays, formatDateShort, formatTime, today } from '../lib/time'
import { money } from '../lib/format'
import { toCSV, downloadText } from '../lib/csv'
import { Alert, Button, Card, EmptyState, PageHeader, cx, useToast } from '../components/ui'
import { PaymentModal, KIND_LABEL } from './PaymentModal'

export function Payments() {
  const data = useData()
  const { run } = useStore()
  const toast = useToast()
  const [period, setPeriod] = useState<Period>('mes')
  const [ref, setRef] = useState(today())
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState<string | null>(null)
  const rep = useMemo(() => incomeReport(data.payments, period, ref), [data.payments, period, ref])
  const [from, to] = periodRange(period, ref)
  const name = (id: string) => data.clients.find((c) => c.id === id)?.name ?? '—'
  const svc = (apptId: string | null) => data.services.find((s) => s.id === data.appointments.find((a) => a.id === apptId)?.serviceId)?.name ?? '—'
  const step = (d: 1 | -1) => setRef(period === 'dia' ? addDays(ref, d) : period === 'semana' ? addDays(ref, 7 * d) : addDays(from, d === 1 ? 32 : -1).slice(0, 8) + '01')

  const balances = data.appointments
    .filter((a) => a.status === 'completada' || a.status === 'confirmada')
    .map((a) => ({ a, ps: paymentState(a, data.payments) }))
    .filter(({ ps }) => ps.balance !== null && ps.balance > 0 && ps.paid > 0)

  const maxMethod = Math.max(1, ...Object.values(rep.byMethod))

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Pagos e ingresos"
        subtitle="Registros manuales. La app no procesa ni verifica pagos."
        actions={
          <>
            <Button size="sm" variant="secondary" disabled={!rep.list.length} onClick={() => downloadText(`ingresos-${from}-a-${to}.csv`, toCSV(rep.list.map((p) => ({ fecha: p.paidAt, clienta: name(p.clientId), servicio: svc(p.appointmentId), tipo: KIND_LABEL[p.kind], medio: p.method, valor: p.amount, nota: p.note }))))}><Download className="h-4 w-4" /> CSV</Button>
            <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Registrar pago</Button>
          </>
        }
      />
      <Card className="mb-5 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-full bg-blush-50 p-1 text-sm">
          {(['dia', 'semana', 'mes'] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={cx('min-h-[38px] flex-1 rounded-full px-4 capitalize sm:flex-none', period === p ? 'bg-white font-medium shadow-sm' : 'text-ink-600')}>{p === 'dia' ? 'Día' : p}</button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => step(-1)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-blush-50" aria-label="Anterior"><ChevronLeft className="h-5 w-5" /></button>
          <span className="min-w-[200px] text-center text-sm font-medium">{from === to ? formatDateShort(from) : `${formatDateShort(from)} – ${formatDateShort(to)}`}</span>
          <button onClick={() => step(1)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-blush-50" aria-label="Siguiente"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-ink-400">Total registrado</p>
          <p className="mt-1 font-display text-4xl font-semibold text-rose-800">{money(rep.total)}</p>
          <p className="text-sm text-ink-600">{rep.count} pagos</p>
          <div className="mt-5 space-y-3">
            {Object.entries(rep.byMethod).sort((a, b) => b[1] - a[1]).map(([m, v]) => (
              <div key={m}>
                <div className="mb-1 flex justify-between text-sm"><span>{m}</span><span className="font-medium">{money(v)}</span></div>
                <div className="h-2 rounded-full bg-blush-50"><div className="h-2 rounded-full bg-gradient-to-r from-champagne to-rose" style={{ width: `${(v / maxMethod) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 font-display text-2xl font-semibold">Movimientos</h2>
          {rep.list.length === 0 ? (
            <EmptyState icon={Wallet} title="Sin pagos en este periodo" />
          ) : (
            <ul className="divide-y divide-blush-100">
              {rep.list.slice().sort((a, b) => b.paidAt.localeCompare(a.paidAt)).map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{name(p.clientId)} · {svc(p.appointmentId)}</p>
                    <p className="text-ink-400">{formatDateShort(p.paidAt)} · {KIND_LABEL[p.kind]} · {p.method}</p>
                  </div>
                  <span className="font-semibold">{money(p.amount)}</span>
                  {confirm === p.id ? (
                    <Button size="sm" variant="danger" onClick={async () => { const r = await run((a) => a.removePayment(p.id)); toast(r.ok ? 'Pago anulado' : r.error, r.ok ? 'success' : 'error'); setConfirm(null) }}>Anular</Button>
                  ) : (
                    <button onClick={() => setConfirm(p.id)} className="grid h-9 w-9 place-items-center rounded-full text-ink-400 hover:bg-red-50 hover:text-red-700" aria-label="Anular pago"><Trash2 className="h-4 w-4" /></button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-5 p-5">
        <h2 className="mb-1 font-display text-2xl font-semibold">Saldos pendientes</h2>
        <p className="mb-3 text-sm text-ink-600">Citas con anticipo o abono que aún no están pagadas por completo.</p>
        {balances.length === 0 ? (
          <Alert tone="success">No hay saldos pendientes.</Alert>
        ) : (
          <ul className="divide-y divide-blush-100">
            {balances.map(({ a, ps }) => (
              <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                <span>{formatDateShort(a.date)} {formatTime(a.startMin)} · {name(a.clientId)} · {svc(a.id)}</span>
                <span className="font-semibold text-rose-800">{money(ps.balance)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <PaymentModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
