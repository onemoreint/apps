import { useEffect, useState } from 'react'
import { RotateCcw, ShieldCheck, UserPlus } from 'lucide-react'
import { useData, useStore } from '../data/store'
import { formatPhone } from '../lib/phone'
import { Alert, Button, Card, Checkbox, Field, Input, PageHeader, Textarea, useToast } from '../components/ui'
import { APP_MODE } from '../data'

const ALL_METHODS = ['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Otro']

export function Settings() {
  const data = useData()
  const { run, adapter } = useStore()
  const toast = useToast()
  const b = data.business
  const [f, setF] = useState({ ...b, whatsapp: formatPhone(b.whatsapp) })
  const [error, setError] = useState<string | null>(null)
  const [newStaff, setNewStaff] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  useEffect(() => setF({ ...data.business, whatsapp: formatPhone(data.business.whatsapp) }), [data.business])

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader title="Configuración" />
      <Card className="p-5">
        <h2 className="mb-4 font-display text-2xl font-semibold">Datos del negocio</h2>
        {error && <div className="mb-3"><Alert>{error}</Alert></div>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre">{(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
          <Field label="Ciudad">{(id) => <Input id={id} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />}</Field>
          <Field label="Dirección">{(id) => <Input id={id} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />}</Field>
          <Field label="WhatsApp del salón">{(id) => <Input id={id} type="tel" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} />}</Field>
          <Field label="Instagram (usuario)">{(id) => <Input id={id} value={f.instagram} onChange={(e) => setF({ ...f, instagram: e.target.value.replace('@', '') })} />}</Field>
          <div className="sm:col-span-2"><Field label="Mensaje de bienvenida">{(id) => <Textarea id={id} value={f.welcome} onChange={(e) => setF({ ...f, welcome: e.target.value })} className="min-h-[70px]" />}</Field></div>
        </div>
        <h3 className="mb-3 mt-6 font-display text-xl font-semibold">Reglas de reserva</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field label="Intervalo (min)">{(id) => <Input id={id} type="number" min={10} max={120} step={5} value={f.slotStepMin} onChange={(e) => setF({ ...f, slotStepMin: Number(e.target.value) })} />}</Field>
          <Field label="Anticipación mín. (min)">{(id) => <Input id={id} type="number" min={0} value={f.minLeadMin} onChange={(e) => setF({ ...f, minLeadMin: Number(e.target.value) })} />}</Field>
          <Field label="Días hacia adelante">{(id) => <Input id={id} type="number" min={1} max={180} value={f.maxDaysAhead} onChange={(e) => setF({ ...f, maxDaysAhead: Number(e.target.value) })} />}</Field>
          <Field label="Solicitudes/día por teléfono">{(id) => <Input id={id} type="number" min={1} max={10} value={f.maxPendingPerPhonePerDay} onChange={(e) => setF({ ...f, maxPendingPerPhonePerDay: Number(e.target.value) })} />}</Field>
        </div>
        <h3 className="mb-3 mt-6 font-display text-xl font-semibold">Medios de pago</h3>
        <div className="flex flex-wrap gap-4">
          {ALL_METHODS.map((m) => (
            <Checkbox key={m} checked={f.paymentMethods.includes(m)} onChange={(v) => setF({ ...f, paymentMethods: v ? [...f.paymentMethods, m] : f.paymentMethods.filter((x) => x !== m) })} label={m} />
          ))}
        </div>
        <Button
          className="mt-6"
          onClick={async () => {
            setError(null)
            if (f.slotStepMin < 10) return setError('El intervalo mínimo es de 10 minutos.')
            if (!f.paymentMethods.length) return setError('Habilita al menos un medio de pago.')
            const r = await run((a) => a.saveBusiness({ ...f }))
            if (!r.ok) return setError(r.error)
            toast('Configuración guardada')
          }}
        >
          Guardar cambios
        </Button>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-display text-2xl font-semibold">Profesionales</h2>
        <p className="mb-4 text-sm text-ink-600">El MVP funciona con una profesional; puedes agregar más y cada una tendrá su propio horario y agenda.</p>
        <ul className="mb-4 divide-y divide-blush-100 rounded-2xl bg-ivory">
          {data.staff.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
              <Input defaultValue={s.name} onBlur={async (e) => { if (e.target.value.trim() && e.target.value !== s.name) { const r = await run((a) => a.saveStaff({ ...s, name: e.target.value.trim() })); toast(r.ok ? 'Nombre actualizado' : r.error, r.ok ? 'success' : 'error') } }} className="max-w-xs py-2" aria-label="Nombre de la profesional" />
              <Checkbox checked={s.active} onChange={async (v) => { if (!v && data.staff.filter((x) => x.active).length === 1) return toast('Debe quedar al menos una profesional activa', 'error'); await run((a) => a.saveStaff({ ...s, active: v })) }} label="Activa" />
            </li>
          ))}
        </ul>
        <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!newStaff.trim()) return; const r = await run((a) => a.saveStaff({ name: newStaff.trim(), active: true })); toast(r.ok ? 'Profesional agregada. Configura su horario en Agenda.' : r.error, r.ok ? 'success' : 'error'); setNewStaff('') }}>
          <Input value={newStaff} onChange={(e) => setNewStaff(e.target.value)} placeholder="Nombre de la profesional" aria-label="Nueva profesional" />
          <Button type="submit" variant="secondary"><UserPlus className="h-4 w-4" /> Agregar</Button>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 font-display text-2xl font-semibold"><ShieldCheck className="h-5 w-5 text-rose-700" /> Seguridad y datos</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-600">
          <li>Modo actual: <strong>{APP_MODE === 'demo' ? 'Demostración (datos en este navegador)' : 'Producción (Supabase)'}</strong>.</li>
          <li>En modo demo los datos viven en el almacenamiento local del navegador: no es un mecanismo seguro para información real.</li>
          <li>En producción, el acceso se controla con Supabase Auth y políticas RLS por negocio (ver DATABASE.md).</li>
        </ul>
        <h3 className="mb-2 mt-5 font-display text-xl font-semibold">Registro de acciones</h3>
        <ul className="max-h-64 divide-y divide-blush-100 overflow-y-auto rounded-2xl bg-ivory text-sm">
          {data.audit.length === 0 ? <li className="px-4 py-3 text-ink-400">Sin acciones registradas aún.</li> : data.audit.slice(0, 60).map((l) => (
            <li key={l.id} className="flex justify-between gap-3 px-4 py-2">
              <span><strong className="font-medium">{l.action.replaceAll('_', ' ')}</strong> <span className="text-ink-400">{l.detail}</span></span>
              <span className="shrink-0 text-xs text-ink-400">{new Date(l.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </li>
          ))}
        </ul>
      </Card>

      {APP_MODE === 'demo' && adapter.reset && (
        <Card className="border-red-100 p-5">
          <h2 className="mb-1 font-display text-2xl font-semibold">Reiniciar demostración</h2>
          <p className="mb-4 text-sm text-ink-600">Borra todos los cambios hechos en este navegador y vuelve a cargar los datos ficticios iniciales.</p>
          {!confirmReset ? (
            <Button variant="danger" onClick={() => setConfirmReset(true)}><RotateCcw className="h-4 w-4" /> Reiniciar datos demo</Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" onClick={async () => { await run((a) => a.reset!()); setConfirmReset(false); toast('Demostración reiniciada') }}>Sí, reiniciar</Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancelar</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
