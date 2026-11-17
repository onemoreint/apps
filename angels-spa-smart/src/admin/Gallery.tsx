import { useState } from 'react'
import { ImagePlus, Images, Trash2 } from 'lucide-react'
import { useData, useStore } from '../data/store'
import { fileToDataUrl } from '../lib/image'
import { Alert, Button, DemoArt, EmptyState, Field, Input, Modal, PageHeader, useToast } from '../components/ui'

export function Gallery() {
  const data = useData()
  const { run } = useStore()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Diseños')
  const [img, setImg] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="animate-fade-up">
      <PageHeader title="Galería" subtitle="Diseños que se muestran en el portal público." actions={<Button size="sm" onClick={() => { setOpen(true); setTitle(''); setImg(undefined); setError(null) }}><ImagePlus className="h-4 w-4" /> Agregar diseño</Button>} />
      {data.gallery.some((g) => g.demo) && <div className="mb-4"><Alert tone="info">Las piezas marcadas como “Demostrativa” son ilustraciones temporales. Reemplázalas por fotos reales del salón.</Alert></div>}
      {data.gallery.length === 0 ? (
        <EmptyState icon={Images} title="Galería vacía" text="Sube fotos de tus mejores trabajos." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.gallery.map((g) => (
            <figure key={g.id} className="group relative overflow-hidden rounded-3xl bg-white shadow-soft">
              <div className="aspect-square"><DemoArt tone={g.tone} src={g.imageDataUrl} alt={g.title} label={g.demo ? 'Demostrativa' : null} /></div>
              <figcaption className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{g.title}</p>
                  <p className="text-xs text-ink-400">{g.category}</p>
                </div>
                <button
                  onClick={async () => { const r = await run((a) => a.removeGalleryItem(g.id)); toast(r.ok ? 'Diseño eliminado' : r.error, r.ok ? 'success' : 'error') }}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-600 hover:bg-red-50 hover:text-red-700"
                  aria-label={`Eliminar ${g.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Agregar diseño">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!img) return setError('Selecciona una foto.')
            const r = await run((a) => a.saveGalleryItem({ title: title.trim() || 'Diseño', category, tone: 0, imageDataUrl: img, demo: false }))
            if (!r.ok) return setError(r.error)
            toast('Diseño agregado')
            setOpen(false)
          }}
        >
          {error && <Alert>{error}</Alert>}
          <label className="flex aspect-video cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-blush-200 bg-white text-sm text-ink-600 hover:border-rose">
            {img ? <img src={img} alt="Vista previa" className="h-full w-full object-cover" /> : (<><ImagePlus className="mb-2 h-8 w-8 text-rose-700" /> Toca para elegir una foto</>)}
            <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setImg(await fileToDataUrl(f)) } catch (err) { setError((err as Error).message) } }} />
          </label>
          <Field label="Título">{(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={50} />}</Field>
          <Field label="Categoría">{(id) => <Input id={id} value={category} onChange={(e) => setCategory(e.target.value)} list="cats" maxLength={30} />}</Field>
          <datalist id="cats">{['Acrílicas', 'Semipermanente', 'Manicure', 'Pedicure', 'Diseños'].map((c) => <option key={c} value={c} />)}</datalist>
          <p className="text-xs text-ink-400">Publica solo fotos propias y, si aparece la clienta, con su autorización.</p>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit">Publicar</Button></div>
        </form>
      </Modal>
    </div>
  )
}
