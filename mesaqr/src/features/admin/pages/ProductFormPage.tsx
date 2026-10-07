import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { db } from '@/shared/lib/supabase';
import { adminMessage } from '@/shared/lib/errors';
import { toast } from '@/shared/ui/Toast';
import { useAdmin } from '../AdminContext';
import { ImageField } from '../ImageField';
import { must, useLoad } from '../lib';
import type { Category, OptionGroup, Product } from '../types';
import { Button, Card, ErrorBox, Field, Input, Loading, Select, TextArea, ToggleRow } from '../ui';

interface ComboRow {
  label: string;
  quantity: number;
}

interface FormState {
  name: string;
  description: string;
  category_id: string;
  type: 'simple' | 'combo';
  price: string;
  image_url: string | null;
  active: boolean;
  available: boolean;
  featured: boolean;
  upsell: boolean;
  groupIds: string[];
  combo: ComboRow[];
}

const EMPTY: FormState = {
  name: '',
  description: '',
  category_id: '',
  type: 'simple',
  price: '',
  image_url: null,
  active: true,
  available: true,
  featured: false,
  upsell: false,
  groupIds: [],
  combo: [],
};

export default function ProductFormPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { business } = useAdmin();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<'name' | 'price' | 'category', string>>>({});

  const { data, error, loading, reload } = useLoad(async () => {
    const c = db();
    const [cats, groups, catGroups] = await Promise.all([
      c.from('categories').select('*').eq('business_id', business.id).order('sort_order'),
      c.from('option_groups').select('*').eq('business_id', business.id).order('sort_order'),
      c.from('category_option_groups').select('category_id, group_id').eq('business_id', business.id),
    ]);
    let product: Product | null = null;
    let groupIds: string[] = [];
    let combo: ComboRow[] = [];
    if (id) {
      const [p, pg, ci] = await Promise.all([
        c.from('products').select('*').eq('id', id).single(),
        c.from('product_option_groups').select('group_id').eq('product_id', id),
        c.from('combo_items').select('label, quantity').eq('combo_product_id', id).order('sort_order'),
      ]);
      product = must(p) as Product;
      groupIds = (must(pg) as { group_id: string }[]).map((r) => r.group_id);
      combo = must(ci) as ComboRow[];
    }
    return {
      categories: must(cats) as Category[],
      groups: must(groups) as OptionGroup[],
      catGroups: must(catGroups) as { category_id: string; group_id: string }[],
      product,
      groupIds,
      combo,
    };
  }, [id, business.id]);

  useEffect(() => {
    if (!data) return;
    const p = data.product;
    setForm(
      p
        ? {
            name: p.name,
            description: p.description ?? '',
            category_id: p.category_id,
            type: p.type,
            price: String(p.price_usd),
            image_url: p.image_url,
            active: p.active,
            available: p.available,
            featured: p.featured,
            upsell: p.upsell,
            groupIds: data.groupIds,
            combo: data.combo,
          }
        : { ...EMPTY, category_id: data.categories[0]?.id ?? '' },
    );
  }, [data]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Escribe el nombre.';
    const price = Number(form.price.replace(',', '.'));
    if (!form.price || !Number.isFinite(price) || price < 0 || price >= 100000) e.price = 'Escribe un precio válido en dólares.';
    if (!form.category_id) e.category = 'Elige una categoría.';
    setErrors(e);
    return Object.keys(e).length === 0 ? price : null;
  };

  const save = async (ev: FormEvent) => {
    ev.preventDefault();
    const price = validate();
    if (price === null) return;
    setSaving(true);
    try {
      const c = db();
      const row = {
        business_id: business.id,
        category_id: form.category_id,
        type: form.type,
        name: form.name.trim().slice(0, 80),
        description: form.description.trim().slice(0, 300) || null,
        image_url: form.image_url,
        price_usd: Math.round(price * 100) / 100,
        active: form.active,
        available: form.available,
        featured: form.featured,
        upsell: form.upsell,
      };
      const saved = must(
        isNew ? await c.from('products').insert(row).select().single() : await c.from('products').update(row).eq('id', id!).select().single(),
      ) as Product;

      // Grupos propios del producto
      must(await c.from('product_option_groups').delete().eq('product_id', saved.id));
      if (form.groupIds.length) {
        must(
          await c.from('product_option_groups').insert(
            form.groupIds.map((g, i) => ({ product_id: saved.id, group_id: g, business_id: business.id, sort_order: i })),
          ),
        );
      }
      // Contenido del combo
      must(await c.from('combo_items').delete().eq('combo_product_id', saved.id));
      const combo = form.type === 'combo' ? form.combo.filter((r) => r.label.trim()) : [];
      if (combo.length) {
        must(
          await c.from('combo_items').insert(
            combo.map((r, i) => ({ combo_product_id: saved.id, label: r.label.trim().slice(0, 80), quantity: Math.max(1, Math.min(20, r.quantity)), sort_order: i })),
          ),
        );
      }
      toast(isNew ? 'Producto creado' : 'Cambios guardados');
      navigate('/dashboard/productos');
    } catch (e) {
      toast(adminMessage(e), 'warn');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id || !confirm(`¿Eliminar "${form.name}"? Si solo se acabó, mejor márcalo como agotado.`)) return;
    const { error: err } = await db().from('products').delete().eq('id', id);
    if (err) toast(adminMessage(err), 'warn');
    else {
      toast('Producto eliminado');
      navigate('/dashboard/productos');
    }
  };

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading || !data) return <Loading />;

  const inherited = new Set(data.catGroups.filter((r) => r.category_id === form.category_id).map((r) => r.group_id));

  return (
    <form onSubmit={save} noValidate>
      <Link to="/dashboard/productos" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-2">
        <ArrowLeft size={16} aria-hidden /> Productos
      </Link>
      <h1 className="mb-5 font-display text-2xl font-extrabold tracking-tight">{isNew ? 'Nuevo producto' : form.name || 'Editar producto'}</h1>

      <div className="space-y-4">
        <Card className="space-y-4">
          <Field label="Nombre" htmlFor="name" error={errors.name}>
            <Input id="name" value={form.name} maxLength={80} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errors.name} />
          </Field>
          <Field label="Descripción" htmlFor="desc" hint="Ingredientes o detalle corto. Máximo 300 caracteres.">
            <TextArea id="desc" value={form.description} maxLength={300} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Precio (USD)" htmlFor="price" error={errors.price}>
              <Input id="price" inputMode="decimal" placeholder="0.00" value={form.price} onChange={(e) => set('price', e.target.value)} aria-invalid={!!errors.price} />
            </Field>
            <Field label="Categoría" htmlFor="cat" error={errors.category}>
              <Select id="cat" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <ImageField label="Foto" value={form.image_url} onChange={(v) => set('image_url', v)} />
        </Card>

        <Card className="space-y-2">
          <ToggleRow label="Disponible" hint="Apágalo cuando se agote: el cliente lo verá como “Agotado”." checked={form.available} onChange={(v) => set('available', v)} />
          <ToggleRow label="Visible en el menú" hint="Ocúltalo si no lo vendes por ahora." checked={form.active} onChange={(v) => set('active', v)} />
          <ToggleRow label="Sugerir para completar el pedido" hint="Aparece en “¿Quieres completar tu pedido?”." checked={form.upsell} onChange={(v) => set('upsell', v)} />
          <ToggleRow label="Destacado" checked={form.featured} onChange={(v) => set('featured', v)} />
        </Card>

        <Card>
          <h2 className="font-display text-lg font-bold">Extras y personalización</h2>
          {data.groups.length === 0 ? (
            <p className="mt-1 text-sm text-ink-2">
              Aún no hay grupos de opciones. <Link to="/dashboard/opciones" className="font-semibold underline">Créalos aquí</Link>.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {data.groups.map((g) => {
                const fromCat = inherited.has(g.id);
                const checked = fromCat || form.groupIds.includes(g.id);
                return (
                  <li key={g.id}>
                    <label className={`flex min-h-11 items-center gap-3 ${fromCat ? 'text-ink-3' : ''}`}>
                      <input
                        type="checkbox"
                        className="size-5 accent-[var(--brand)]"
                        checked={checked}
                        disabled={fromCat}
                        onChange={(e) =>
                          set('groupIds', e.target.checked ? [...form.groupIds, g.id] : form.groupIds.filter((x) => x !== g.id))
                        }
                      />
                      <span className="flex-1">{g.name}</span>
                      {fromCat && <span className="text-xs">por su categoría</span>}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="space-y-3">
          <ToggleRow label="Es un combo" hint="Muestra al cliente qué incluye." checked={form.type === 'combo'} onChange={(v) => set('type', v ? 'combo' : 'simple')} />
          {form.type === 'combo' && (
            <div className="space-y-2">
              {form.combo.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    aria-label={`Cantidad del ítem ${i + 1}`}
                    inputMode="numeric"
                    className="w-16 text-center"
                    value={r.quantity}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      set('combo', form.combo.map((x, j) => (j === i ? { ...x, quantity: Number.isFinite(n) ? n : 1 } : x)));
                    }}
                  />
                  <Input
                    aria-label={`Ítem ${i + 1} del combo`}
                    placeholder="Ej.: Papas fritas"
                    value={r.label}
                    maxLength={80}
                    onChange={(e) => set('combo', form.combo.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  />
                  <Button variant="ghost" aria-label="Quitar ítem" onClick={() => set('combo', form.combo.filter((_, j) => j !== i))}>
                    <Trash2 size={18} aria-hidden />
                  </Button>
                </div>
              ))}
              <Button variant="secondary" onClick={() => set('combo', [...form.combo, { label: '', quantity: 1 }])}>
                <Plus size={18} aria-hidden /> Agregar ítem
              </Button>
            </div>
          )}
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" busy={saving} className="flex-1 sm:flex-none">
            {isNew ? 'Crear producto' : 'Guardar cambios'}
          </Button>
          {!isNew && (
            <Button variant="danger" onClick={() => void remove()}>
              Eliminar
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
