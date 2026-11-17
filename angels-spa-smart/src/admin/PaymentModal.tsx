import { useEffect, useMemo, useState } from 'react'
import { useData, useStore } from '../data/store'
import type { PaymentKind } from '../types'
import { paymentState } from '../lib/metrics'
import { formatDateShort, formatTime, today } from '../lib/time'
import { money } from '../lib/format'
import { Alert, Button, Field, Input, Modal, Select, Textarea, useToast } from '../components/ui'

const KIND_LABEL: Record<PaymentKind, string> = { anticipo: 'Anticipo', abono: 'Abono', pago_total: 'Pago total' }
export { KIND_LABEL }

export function PaymentModal({ open, onClose, appointmentId }: { open: boolean; onClose: () => void; appointmentId?: string }) {
  const data = useData()
  const { run } = useStore()
  const toast = useToast()
  const candidates = useMemo(
    () =>
      data.appointments
        .filter((a) => a.status !== 'cancelada')
        .map((a) => ({ a, ps: paymentState(a, data.payments) }))
        .filter(({ ps }) => ps.balance === null || ps.balance > 0)
        .sort((x, y) => y.a.date.localeCompare(x.a.date))
        .slice(0, 60),
    [data],
  )
  const [apptId, setApptId] = useState(appointmentId ?? '')
  const appt = data.appointments.find((a) => a.id === apptId)
  const ps = appt ? paymentState(appt, data.payments) : null
  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState<PaymentKind>('pago_total')
  const [method, setMethod] = useState(data.business.paymentMethods[0] ?? 'Efectivo')
  const [paidAt, setPaidAt] = useState(today())
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setApptId(appointmentId ?? '')
      setError(null)
      setNote('')
      setPaidAt(today())
    }
  }, [open, appointmentId])

  useEffect(() => {
    if (ps?.balance) {
      setAmount(String(ps.balance))
      setKind(ps.paid > 0 ? 'abono' : 'pago_total')
    } else setAmount('')
  }, [apptId]) // eslint-disable-line react-hooks/exhaustive-deps

  const name = (id: string) => data.clients.find((c) => c.id === id)?.name ?? '—'
  const svc = (id: string) => data.services.find((s) => s.id === id)?.name ?? '—'

  return (
    <Modal open={open} onClose={onClose} title="Registrar pago">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!appt) return setError('Selecciona la cita.')
          const value = Math.round(Number(amount.replace(/[^\d]/g, '')))
          const r = await run((a) => a.addPayment({ appointmentId: appt.id, clientId: appt.clientId, amount: value, kind, method, paidAt, note }))
          if (!r.ok) return setError(r.error)
          toast('Pago registrado')
          onClose()
        }}
      >
        <Alert tone="info">Registro manual. La app no procesa ni verifica transacciones: confirma el dinero recibido antes de anotarlo.</Alert>
        {error && <Alert>{error}</Alert>}
        {!appointmentId && (
          <Field label="Cita">
            {(id) => (
              <Select id={id} value={apptId} onChange={(e) => setApptId(e.target.value)} required>
                <option value="">Selecciona una cita con saldo…</option>
                {candidates.map(({ a, ps }) => (
                  <option key={a.id} value={a.id}>
                    {formatDateShort(a.date)} {formatTime(a.startMin)} · {name(a.clientId)} · {svc(a.serviceId)} · saldo {ps.balance === null ? 's/precio' : money(ps.balance)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        {appt && ps && (
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-3 text-sm">
            <div><p className="text-ink-400">Precio</p><p className="font-semibold">{money(appt.price)}</p></div>
            <div><p className="text-ink-400">Pagado</p><p className="font-semibold">{money(ps.paid)}</p></div>
            <div><p className="text-ink-400">Saldo</p><p className="font-semibold text-rose-800">{ps.balance === null ? '—' : money(ps.balance)}</p></div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Valor (COP)">{(id) => <Input id={id} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} required />}</Field>
          <Field label="Tipo">
            {(id) => (
              <Select id={id} value={kind} onChange={(e) => setKind(e.target.value as PaymentKind)}>
                {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Medio de pago">
            {(id) => (
              <Select id={id} value={method} onChange={(e) => setMethod(e.target.value)}>
                {data.business.paymentMethods.map((m) => <option key={m}>{m}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Fecha de pago">{(id) => <Input id={id} type="date" value={paidAt} max={today()} onChange={(e) => setPaidAt(e.target.value)} required />}</Field>
        </div>
        <Field label="Nota (opcional)">{(id) => <Textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[60px]" />}</Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Registrar</Button>
        </div>
      </form>
    </Modal>
  )
}
