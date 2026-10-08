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
import type { Badge, Craving } from '@/shared/types/menu';
import { BADGE_ORDER, BADGES, CRAVINGS } from '@/shared/config/experience';
import { formatUsd } from '@/shared/lib/money';
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
  badges: Badge[];
  cravings: Craving[];
  compareAt: string;
  comboUpgradeId: string;
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
  badges: [],
  cravings: [],
  compareAt: '',
  comboUpgradeId: '',
};

const CRAVING_OPTIONS = CRAVINGS.filter((c): c is (typeof CRAVINGS)[number] & { key: Craving } => c.key !== 'economico');

const chip = (on: boolean) =>
  `min-h-10 rounded-full border-2 px-3 text-sm font-semibold transition-colors ${on ? 'border-ink bg-ink text-white' : 'border-line bg-paper text-ink'}`;

export default function ProductFormPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { business } = useAdmin();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<'name' | 'price' | 'category' | 'compareAt', string>>>({});

  const { data, error, loading, reload } = useLoad(async () => {
    const c = db();
    const [cats, groups, catGroups, all] = await Promise.all([
      c.from('categories').select('*').eq('business_id', business.id).order('sort_order'),
      c.from('option_groups').select('*').eq('business_id', business.id).order('sort_order'),
      c.from('category_option_groups').select('category_id, group_id').eq('business_id', business.id),
      c.from('products').select('id, name, type, price_usd').eq('business_id', business.id).order('name'),
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
      products: must(all) as Pick<Product, 'id' | 'name' | 'type' | 'price_usd'>[],
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
            badges: p.badges ?? [],
            cravings: p.cravings ?? [],
            compareAt: p.compare_at_price_usd === null || p.compare_at_price_usd === undefined ? '' : String(p.compare_at_price_usd),
            comboUpgradeId: p.combo_upgrade_id ?? '',
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
    if (form.compareAt.trim()) {
      const before = Number(form.compareAt.replace(',', '.'));
      if (!Number.isFinite(before) || before <= 0 || before >= 100000) e.compareAt = 'Escribe un precio válido o déjalo vacío.';
      else if (Number.isFinite(price) && before <= price) e.compareAt = 'Debe ser mayor que el precio actual para mostrar el ahorro.';
    }
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
        badges: BADGE_ORDER.filter((b) => form.badges.includes(b)),
        cravings: form.cravings,
        compare_at_price_usd: form.compareAt.trim() ? Math.round(Number(form.compareAt.replace(',', '.')) * 100) / 100 : null,
        combo_upgrade_id: form.comboUpgradeId && form.comboUpgradeId !== id ? form.comboUpgradeId : null,
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
          <ToggleRow label="Sugerir para completar el pedido" hint="Aparece en “Completa tu pedido” y dentro del carrito." checked={form.upsell} onChange={(v) => set('upsell', v)} />
          <ToggleRow label="Favorito de la casa" hint="Se muestra arriba, en Inicio (hasta 4)." checked={form.featured} onChange={(v) => set('featured', v)} />
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold">Etiquetas</h2>
            <p className="text-sm text-ink-2">Las eliges tú. No afirman cifras de ventas.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {BADGE_ORDER.map((b) => {
                const on = form.badges.includes(b);
                return (
                  <button key={b} type="button" aria-pressed={on} className={chip(on)} onClick={() => set('badges', on ? form.badges.filter((x) => x !== b) : [...form.badges, b])}>
                    {BADGES[b].emoji} {BADGES[b].label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">Antojos</h2>
            <p className="text-sm text-ink-2">Para “¿No sabes qué pedir?”. “Algo económico” se calcula solo por precio.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CRAVING_OPTIONS.map((c) => {
                const on = form.cravings.includes(c.key);
                return (
                  <button key={c.key} type="button" aria-pressed={on} className={chip(on)} onClick={() => set('cravings', on ? form.cravings.filter((x) => x !== c.key) : [...form.cravings, c.key])}>
                    {c.emoji} {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-display text-lg font-bold">Ofertas y combos</h2>
          <Field
            label="Precio anterior (USD)"
            htmlFor="compare"
            error={errors.compareAt}
            hint="Opcional. Si es mayor que el precio, el cliente ve “Antes” tachado y cuánto ahorra, y el producto aparece en Ofertas."
          >
            <Input id="compare" inputMode="decimal" placeholder="Vacío = sin oferta" value={form.compareAt} onChange={(e) => set('compareAt', e.target.value)} aria-invalid={!!errors.compareAt} />
          </Field>
          <Field label="Ofrecer convertirlo en combo" htmlFor="combo-up" hint="Al agregar este producto, se le pregunta al cliente si lo quiere en este combo. Para combos, el ahorro sale del precio anterior del combo.">
            <Select id="combo-up" value={form.comboUpgradeId} onChange={(e) => set('comboUpgradeId', e.target.value)}>
              <option value="">No ofrecer combo</option>
              {data.products
                .filter((p) => p.id !== id)
                .sort((a, b) => (a.type === b.type ? 0 : a.type === 'combo' ? -1 : 1))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.type === 'combo' ? '🍱 ' : ''}
                    {p.name} · {formatUsd(Number(p.price_usd))}
                  </option>
                ))}
            </Select>
          </Field>
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
