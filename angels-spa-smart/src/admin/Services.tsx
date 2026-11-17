import { useEffect, useState } from 'react'
import { Clock, ImagePlus, Pencil, Plus, Scissors } from 'lucide-react'
import { useData, useStore } from '../data/store'
import type { Service } from '../types'
import { durationLabel, money } from '../lib/format'
import { fileToDataUrl } from '../lib/image'
import { Alert, Badge, Button, Card, Checkbox, DemoArt, EmptyState, Field, Input, Modal, PageHeader, Textarea, useToast } from '../components/ui'

export function Services() {
  const data = useData()
  const [edit, setEdit] = useState<Service | 'new' | null>(null)
  const list = data.services.slice().sort((a, b) => a.order - b.order)
  return (
    <div className="animate-fade-up">
      <PageHeader title="Servicios" subtitle="Precios, duraciones y fotos que ve la clienta en el portal." actions={<Button size="sm" onClick={() => setEdit('new')}><Plus className="h-4 w-4" /> Nuevo servicio</Button>} />
      {list.length === 0 ? (
        <EmptyState icon={Scissors} title="Sin servicios" text="Crea el primer servicio para habilitar las reservas." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {list.map((s) => (
            <Card key={s.id} className="overflow-hidden">
              <div className="aspect-[4/3]"><DemoArt tone={s.tone} src={s.imageDataUrl} alt={s.name} label={s.imageDataUrl ? null : 'Demostrativa'} /></div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-xl font-semibold">{s.name}</p>
                  {!s.active && <Badge tone="ink">Oculto</Badge>}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-ink-600">{s.description}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-ink-400"><Clock className="h-4 w-4" /> {durationLabel(s.durationMin)}</span>
                  <span className="font-semibold text-rose-800">{money(s.price)}</span>
                </div>
                <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={() => setEdit(s)}><Pencil className="h-4 w-4" /> Editar</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <ServiceModal open={!!edit} service={edit === 'new' ? null : edit} nextOrder={list.length + 1} onClose={() => setEdit(null)} />
    </div>
  )
}

function ServiceModal({ open, service, nextOrder, onClose }: { open: boolean; service: Service | null; nextOrder: number; onClose: () => void }) {
  const { run } = useStore()
  const toast = useToast()
  const [f, setF] = useState({ name: '', description: '', durationMin: '60', price: '', active: true, order: String(nextOrder), imageDataUrl: '' as string | undefined, tone: 0 })
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    setError(null)
    setF({
      name: service?.name ?? '',
      description: service?.description ?? '',
      durationMin: String(service?.durationMin ?? 60),
      price: service?.price == null ? '' : String(service.price),
      active: service?.active ?? true,
      order: String(service?.order ?? nextOrder),
      imageDataUrl: service?.imageDataUrl,
      tone: service?.tone ?? nextOrder % 6,
    })
  }, [open, service, nextOrder])
  return (
    <Modal open={open} onClose={onClose} title={service ? 'Editar servicio' : 'Nuevo servicio'}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          const price = f.price.trim() === '' ? null : Number(f.price.replace(/[^\d]/g, ''))
          const r = await run((a) => a.saveService({ id: service?.id, name: f.name.trim(), description: f.description.trim(), durationMin: Number(f.durationMin), price, active: f.active, order: Number(f.order) || 1, tone: f.tone, imageDataUrl: f.imageDataUrl }))
          if (!r.ok) return setError(r.error)
          toast('Servicio guardado')
          onClose()
        }}
      >
        {error && <Alert>{error}</Alert>}
        <Field label="Nombre">{(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={60} />}</Field>
        <Field label="Descripción">{(id) => <Textarea id={id} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={200} className="min-h-[70px]" />}</Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Duración (min)">{(id) => <Input id={id} type="number" min={15} max={480} step={15} value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: e.target.value })} required />}</Field>
          <Field label="Precio COP" hint="Vacío = por confirmar">{(id, d) => <Input id={id} aria-describedby={d} inputMode="numeric" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />}</Field>
          <Field label="Orden">{(id) => <Input id={id} type="number" min={1} value={f.order} onChange={(e) => setF({ ...f, order: e.target.value })} />}</Field>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-20 w-24 overflow-hidden rounded-2xl"><DemoArt tone={f.tone} src={f.imageDataUrl} label={null} /></div>
          <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full border border-rose/30 bg-white px-4 text-sm text-rose-800 hover:bg-blush-50">
            <ImagePlus className="h-4 w-4" /> Subir foto
            <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { setF({ ...f, imageDataUrl: await fileToDataUrl(file) }) } catch (err) { setError((err as Error).message) } }} />
          </label>
          {f.imageDataUrl && <Button type="button" size="sm" variant="ghost" onClick={() => setF({ ...f, imageDataUrl: undefined })}>Quitar</Button>}
        </div>
        <p className="text-xs text-ink-400">Usa solo fotografías propias del salón o con licencia.</p>
        <Checkbox checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Visible y reservable en el portal" />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  )
}
