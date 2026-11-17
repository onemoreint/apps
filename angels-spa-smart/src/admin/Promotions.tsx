import { useEffect, useState } from 'react'
import { Gift, MessageCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import { useData, useStore } from '../data/store'
import type { Promotion } from '../types'
import { addDays, formatDateShort, today } from '../lib/time'
import { buildMessage, waLink } from '../lib/whatsapp'
import { formatPhone } from '../lib/phone'
import { Alert, Badge, Button, Card, Checkbox, EmptyState, Field, Input, LinkButton, Modal, PageHeader, Select, Textarea, useToast } from '../components/ui'

export function Promotions() {
  const data = useData()
  const { run } = useStore()
  const toast = useToast()
  const [edit, setEdit] = useState<Promotion | 'new' | null>(null)
  const [share, setShare] = useState<Promotion | null>(null)
  const t = today()
  const state = (p: Promotion) => (!p.active ? ['Inactiva', 'ink'] : p.validTo < t ? ['Vencida', 'ink'] : p.validFrom > t ? ['Programada', 'champagne'] : ['Activa', 'green']) as [string, 'ink' | 'champagne' | 'green']

  return (
    <div className="animate-fade-up">
      <PageHeader title="Promociones" subtitle="Las promociones activas y vigentes aparecen en el portal." actions={<Button size="sm" onClick={() => setEdit('new')}><Plus className="h-4 w-4" /> Nueva promoción</Button>} />
      {data.promotions.length === 0 ? (
        <EmptyState icon={Gift} title="Sin promociones" text="Crea una para atraer más reservas." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.promotions.map((p) => {
            const [label, tone] = state(p)
            return (
              <Card key={p.id} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-2xl font-semibold">{p.title}</p>
                  <Badge tone={tone}>{label}</Badge>
                </div>
                <p className="mt-1 text-sm text-ink-600">{p.description}</p>
                <p className="mt-2 text-xs text-ink-400">{formatDateShort(p.validFrom)} – {formatDateShort(p.validTo)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setEdit(p)}><Pencil className="h-4 w-4" /> Editar</Button>
                  <Button size="sm" variant="secondary" onClick={() => setShare(p)}><MessageCircle className="h-4 w-4" /> Compartir</Button>
                  <Button size="sm" variant="ghost" onClick={async () => { const r = await run((a) => a.removePromotion(p.id)); toast(r.ok ? 'Promoción eliminada' : r.error, r.ok ? 'success' : 'error') }}><Trash2 className="h-4 w-4" /> Eliminar</Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      <PromoModal open={!!edit} promo={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />
      <ShareModal promo={share} onClose={() => setShare(null)} />
    </div>
  )
}

function PromoModal({ open, promo, onClose }: { open: boolean; promo: Promotion | null; onClose: () => void }) {
  const data = useData()
  const { run } = useStore()
  const toast = useToast()
  const [f, setF] = useState({ title: '', description: '', validFrom: today(), validTo: addDays(today(), 30), active: true, serviceId: '' })
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (open) {
      setError(null)
      setF({ title: promo?.title ?? '', description: promo?.description ?? '', validFrom: promo?.validFrom ?? today(), validTo: promo?.validTo ?? addDays(today(), 30), active: promo?.active ?? true, serviceId: promo?.serviceId ?? '' })
    }
  }, [open, promo])
  return (
    <Modal open={open} onClose={onClose} title={promo ? 'Editar promoción' : 'Nueva promoción'}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          const r = await run((a) => a.savePromotion({ id: promo?.id, ...f, title: f.title.trim(), description: f.description.trim(), serviceId: f.serviceId || null }))
          if (!r.ok) return setError(r.error)
          toast('Promoción guardada')
          onClose()
        }}
      >
        {error && <Alert>{error}</Alert>}
        <Field label="Título">{(id) => <Input id={id} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required maxLength={60} />}</Field>
        <Field label="Descripción y condiciones">{(id) => <Textarea id={id} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} required maxLength={300} />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Desde">{(id) => <Input id={id} type="date" value={f.validFrom} onChange={(e) => setF({ ...f, validFrom: e.target.value })} required />}</Field>
          <Field label="Hasta">{(id) => <Input id={id} type="date" value={f.validTo} onChange={(e) => setF({ ...f, validTo: e.target.value })} required />}</Field>
        </div>
        <Field label="Servicio relacionado (opcional)">
          {(id) => (
            <Select id={id} value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value })}>
              <option value="">Todos / general</option>
              {data.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          )}
        </Field>
        <Checkbox checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Activa" />
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit">Guardar</Button></div>
      </form>
    </Modal>
  )
}

function ShareModal({ promo, onClose }: { promo: Promotion | null; onClose: () => void }) {
  const data = useData()
  if (!promo) return null
  const optedIn = data.clients.filter((c) => !c.anonymized && c.consents.marketing)
  return (
    <Modal open onClose={onClose} title="Compartir promoción">
      <div className="space-y-4">
        <Alert tone="info">Solo aparecen clientas que autorizaron recibir promociones. Cada botón abre WhatsApp con el mensaje listo; el envío lo haces tú, uno a uno.</Alert>
        {optedIn.length === 0 ? (
          <p className="text-sm text-ink-600">Ninguna clienta ha autorizado promociones todavía.</p>
        ) : (
          <ul className="divide-y divide-blush-100 rounded-2xl bg-white">
            {optedIn.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span>{c.name}<span className="block text-xs text-ink-400">{formatPhone(c.phone)}</span></span>
                <LinkButton size="sm" variant="whatsapp" external href={waLink(c.phone, buildMessage('promocion', { businessName: data.business.name, clientName: c.name, promoTitle: promo.title, promoDescription: promo.description }))}>
                  <MessageCircle className="h-4 w-4" /> Abrir
                </LinkButton>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
