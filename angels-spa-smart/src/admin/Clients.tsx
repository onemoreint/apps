import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Cake, CalendarPlus, Download, MessageCircle, Pencil, Search, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react'
import { useData, useStore } from '../data/store'
import type { Client } from '../types'
import { clientStats } from '../lib/metrics'
import { clientPoints, loyaltyTier } from '../lib/loyalty'
import { formatDateShort, formatTime } from '../lib/time'
import { money, initials } from '../lib/format'
import { formatPhone } from '../lib/phone'
import { toCSV, downloadText } from '../lib/csv'
import { buildMessage, waLink } from '../lib/whatsapp'
import { clientFormSchema, type ClientForm } from '../data/schemas'
import { Alert, Badge, Button, Checkbox, EmptyState, Field, Input, LinkButton, Modal, PageHeader, StatusBadge, Textarea, cx, useToast } from '../components/ui'
import { AppointmentModal } from './appointments'

export function Clients() {
  const data = useData()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Client | 'new' | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const selectedId = params.get('id')
  const selected = data.clients.find((c) => c.id === selectedId) ?? null

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const digits = s.replace(/\D/g, '')
    return data.clients
      .filter((c) => !c.anonymized)
      .filter((c) => !s || c.name.toLowerCase().includes(s) || (digits.length >= 3 && c.phone.includes(digits)))
      .map((c) => ({ c, st: clientStats(data, c.id), pts: clientPoints(data.loyaltyTx, c.id) }))
      .sort((a, b) => a.c.name.localeCompare(b.c.name))
  }, [data, q])

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Clientas"
        subtitle={`${list.length} registradas`}
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={() => setExportOpen(true)}><Download className="h-4 w-4" /> Exportar CSV</Button>
            <Button size="sm" onClick={() => setEditing('new')}><UserPlus className="h-4 w-4" /> Nueva clienta</Button>
          </>
        }
      />
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o teléfono" className="pl-11" aria-label="Buscar clientas" />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Users} title={q ? 'Sin resultados' : 'Aún no hay clientas'} text={q ? 'Prueba con otro nombre o número.' : 'Se crean automáticamente con cada reserva o puedes agregarlas manualmente.'} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map(({ c, st, pts }) => (
            <button key={c.id} onClick={() => setParams({ id: c.id })} className="flex items-center gap-3 rounded-3xl border border-blush-100 bg-white p-4 text-left shadow-soft transition hover:border-rose">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blush to-rose text-sm font-semibold text-white">{initials(c.name)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                <p className="text-sm text-ink-600">{formatPhone(c.phone)}</p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {st.completed.length} visitas · {st.lastVisit ? `última ${formatDateShort(st.lastVisit.date)}` : 'sin visitas'}
                </p>
              </div>
              <Badge tone={loyaltyTier(pts).tone === 'champagne' ? 'champagne' : 'rose'}>{pts} pts</Badge>
            </button>
          ))}
        </div>
      )}

      <ClientDetail client={selected} onClose={() => setParams({})} onEdit={(c) => setEditing(c)} />
      <ClientFormModal open={!!editing} client={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={(c) => setParams({ id: c.id })} />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  )
}

function ClientDetail({ client, onClose, onEdit }: { client: Client | null; onClose: () => void; onEdit: (c: Client) => void }) {
  const data = useData()
  const { run } = useStore()
  const toast = useToast()
  const [book, setBook] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  useEffect(() => setConfirmDelete(false), [client?.id])
  if (!client) return null
  const st = clientStats(data, client.id)
  const pts = clientPoints(data.loyaltyTx, client.id)
  const tier = loyaltyTier(pts)
  const svcName = (id: string) => data.services.find((s) => s.id === id)?.name ?? '—'
  const tx = data.loyaltyTx.filter((t) => t.clientId === client.id).slice().reverse()

  return (
    <>
      <Modal open={!book} onClose={onClose} title={client.name} wide>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="ink">{formatPhone(client.phone)}</Badge>
            <Badge tone={tier.tone === 'champagne' ? 'champagne' : 'rose'}>{tier.label} · {pts} pts</Badge>
            {client.birthday && <Badge tone="champagne"><Cake className="h-3 w-3" /> {client.birthday}</Badge>}
            <span className="text-xs text-ink-400">Registrada el {formatDateShort(client.createdAt.slice(0, 10))} · ID {client.id.slice(0, 8)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Visitas', String(st.completed.length)],
              ['Total pagado', money(st.totalPaid)],
              ['Última visita', st.lastVisit ? formatDateShort(st.lastVisit.date) : '—'],
              ['Próxima cita', st.next ? `${formatDateShort(st.next.date)} ${formatTime(st.next.startMin)}` : '—'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white p-3">
                <p className="text-xs text-ink-400">{k}</p>
                <p className="font-semibold">{v}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setBook(true)}><CalendarPlus className="h-4 w-4" /> Agendar</Button>
            <Button size="sm" variant="secondary" onClick={() => onEdit(client)}><Pencil className="h-4 w-4" /> Editar ficha</Button>
            <LinkButton size="sm" variant="whatsapp" external href={waLink(client.phone, `Hola ${client.name.split(' ')[0]} 💖, te escribimos de ${data.business.name}.`)}><MessageCircle className="h-4 w-4" /> WhatsApp</LinkButton>
            {client.consents.birthday && client.birthday && (
              <LinkButton size="sm" variant="secondary" external href={waLink(client.phone, buildMessage('cumpleanos', { businessName: data.business.name, clientName: client.name }))}><Cake className="h-4 w-4" /> Felicitar</LinkButton>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-4">
              <p className="mb-1 text-sm font-medium">Preferencias de diseño</p>
              <p className="text-sm text-ink-600">{client.preferences || 'Sin registrar.'}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="mb-1 text-sm font-medium">Observaciones internas</p>
              <p className="text-sm text-ink-600">{client.notes || 'Sin observaciones.'}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium"><ShieldCheck className="h-4 w-4 text-rose-700" /> Consentimientos</p>
            <ul className="grid grid-cols-1 gap-1 text-sm text-ink-600 sm:grid-cols-3">
              <li>Tratamiento de datos: <strong>{client.consents.dataTreatment ? 'Sí' : 'No'}</strong></li>
              <li>Promociones: <strong>{client.consents.marketing ? 'Sí' : 'No'}</strong></li>
              <li>Cumpleaños: <strong>{client.consents.birthday ? 'Sí' : 'No'}</strong></li>
            </ul>
            <p className="mt-1 text-xs text-ink-400">Actualizado: {formatDateShort(client.consents.updatedAt.slice(0, 10))}</p>
          </div>

          <div>
            <p className="mb-2 font-display text-xl font-semibold">Historial de citas</p>
            {st.appts.length === 0 ? (
              <p className="text-sm text-ink-600">Sin citas registradas.</p>
            ) : (
              <ul className="divide-y divide-blush-100 rounded-2xl bg-white">
                {st.appts.slice().reverse().map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                    <span>{formatDateShort(a.date)} · {formatTime(a.startMin)} · {svcName(a.serviceId)}</span>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
            {st.servicesDone.length > 0 && <p className="mt-2 text-xs text-ink-400">Servicios realizados: {st.servicesDone.map(svcName).join(', ')}</p>}
          </div>

          {tx.length > 0 && (
            <div>
              <p className="mb-2 font-display text-xl font-semibold">Movimientos de puntos</p>
              <ul className="max-h-40 divide-y divide-blush-100 overflow-y-auto rounded-2xl bg-white text-sm">
                {tx.map((t) => (
                  <li key={t.id} className="flex justify-between px-4 py-2">
                    <span>{t.description}</span>
                    <span className={cx('font-medium', t.points > 0 ? 'text-emerald-700' : 'text-red-700')}>{t.points > 0 ? '+' : ''}{t.points}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-blush-100 pt-4">
            {!confirmDelete ? (
              <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" /> Suprimir datos personales</Button>
            ) : (
              <Alert>
                <p className="mb-2">Se borrarán nombre, teléfono, preferencias y notas de esta clienta (derecho de supresión). Las cifras de citas y pagos se conservan de forma anónima. Esta acción no se puede deshacer.</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={async () => {
                      const r = await run((a) => a.anonymizeClient(client.id))
                      toast(r.ok ? 'Datos suprimidos' : r.error, r.ok ? 'success' : 'error')
                      if (r.ok) onClose()
                    }}
                  >
                    Confirmar supresión
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
                </div>
              </Alert>
            )}
          </div>
        </div>
      </Modal>
      <AppointmentModal open={book} onClose={() => setBook(false)} initialClientId={client.id} />
    </>
  )
}

function ClientFormModal({ open, client, onClose, onSaved }: { open: boolean; client: Client | null; onClose: () => void; onSaved: (c: Client) => void }) {
  const { run } = useStore()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<ClientForm>({ resolver: zodResolver(clientFormSchema) })
  useEffect(() => {
    if (open) {
      setError(null)
      form.reset({
        name: client?.name ?? '',
        phone: client ? client.phone.replace(/^57/, '') : '',
        birthday: client?.birthday ?? '',
        preferences: client?.preferences ?? '',
        notes: client?.notes ?? '',
        marketing: client?.consents.marketing ?? false,
        birthdayConsent: client?.consents.birthday ?? false,
      })
    }
  }, [open, client]) // eslint-disable-line react-hooks/exhaustive-deps
  const e = form.formState.errors
  return (
    <Modal open={open} onClose={onClose} title={client ? 'Editar clienta' : 'Nueva clienta'}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={form.handleSubmit(async (v) => {
          const r = await run((a) =>
            a.upsertClient(
              { name: v.name, phone: v.phone, birthday: v.birthdayConsent ? v.birthday : '', preferences: v.preferences, notes: v.notes, consents: { dataTreatment: true, marketing: v.marketing, birthday: v.birthdayConsent } },
              client?.id,
            ),
          )
          if (!r.ok) return setError(r.error)
          toast(client ? 'Ficha actualizada' : 'Clienta registrada')
          onSaved(r.value)
          onClose()
        })}
      >
        {error && <Alert>{error}</Alert>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nombre" error={e.name?.message}>{(id) => <Input id={id} {...form.register('name')} aria-invalid={!!e.name} />}</Field>
          <Field label="Celular" error={e.phone?.message} hint="Se normaliza para evitar duplicados.">{(id) => <Input id={id} type="tel" {...form.register('phone')} aria-invalid={!!e.phone} />}</Field>
        </div>
        <Field label="Preferencias de diseño">{(id) => <Textarea id={id} {...form.register('preferences')} className="min-h-[70px]" />}</Field>
        <Field label="Observaciones internas">{(id) => <Textarea id={id} {...form.register('notes')} className="min-h-[70px]" />}</Field>
        <div className="space-y-3 rounded-2xl bg-white p-4">
          <p className="text-sm font-medium">Autorizaciones de la clienta</p>
          <Checkbox checked={!!form.watch('marketing')} onChange={(v) => form.setValue('marketing', v)} label="Autoriza recibir promociones por WhatsApp" />
          <Checkbox checked={!!form.watch('birthdayConsent')} onChange={(v) => form.setValue('birthdayConsent', v)} label="Autoriza registrar y usar su fecha de cumpleaños" />
          {form.watch('birthdayConsent') && (
            <Field label="Cumpleaños (MM-DD)" error={e.birthday?.message}>{(id) => <Input id={id} placeholder="03-14" {...form.register('birthday')} />}</Field>
          )}
          <p className="text-xs text-ink-400">Registra solo autorizaciones que la clienta haya dado expresamente.</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  )
}

function ExportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useData()
  const [onlyMarketing, setOnlyMarketing] = useState(true)
  const rows = data.clients
    .filter((c) => !c.anonymized && c.consents.dataTreatment && (!onlyMarketing || c.consents.marketing))
    .map((c) => {
      const st = clientStats(data, c.id)
      return {
        id: c.id,
        nombre: c.name,
        telefono: formatPhone(c.phone),
        fecha_registro: c.createdAt.slice(0, 10),
        visitas: st.completed.length,
        total_pagado: st.totalPaid,
        ultima_visita: st.lastVisit?.date ?? '',
        puntos: clientPoints(data.loyaltyTx, c.id),
        autoriza_promociones: c.consents.marketing ? 'si' : 'no',
      }
    })
  return (
    <Modal open={open} onClose={onClose} title="Exportar clientas">
      <div className="space-y-4">
        <p className="text-sm text-ink-600">Se exportan solo clientas con autorización de tratamiento de datos. Las observaciones internas no se incluyen.</p>
        <Checkbox checked={onlyMarketing} onChange={setOnlyMarketing} label="Solo clientas que autorizaron promociones" />
        <p className="text-sm">Registros a exportar: <strong>{rows.length}</strong></p>
        <Alert tone="info">Guarda el archivo en un lugar seguro y no lo compartas con terceros sin autorización.</Alert>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={!rows.length} onClick={() => { downloadText(`clientas-angels-spa-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows)); onClose() }}>
            <Download className="h-4 w-4" /> Descargar CSV
          </Button>
        </div>
      </div>
    </Modal>
  )
}
