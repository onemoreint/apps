import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search } from 'lucide-react';
import { db } from '@/shared/lib/supabase';
import { adminMessage } from '@/shared/lib/errors';
import { formatUsd } from '@/shared/lib/money';
import { toast } from '@/shared/ui/Toast';
import { ProductImage } from '@/shared/ui/ProductImage';
import { useAdmin } from '../AdminContext';
import { must, useLoad } from '../lib';
import type { Category, Product } from '../types';
import { Empty, ErrorBox, Input, Loading, PageHeader, Toggle } from '../ui';

export default function ProductsPage() {
  const { business } = useAdmin();
  const [q, setQ] = useState('');
  const { data, setData, error, loading, reload } = useLoad(async () => {
    const [cats, prods] = await Promise.all([
      db().from('categories').select('*').eq('business_id', business.id).order('sort_order').order('name'),
      db().from('products').select('*').eq('business_id', business.id).order('sort_order').order('name'),
    ]);
    return { categories: must(cats) as Category[], products: must(prods) as Product[] };
  }, [business.id]);

  /** Cambio inmediato (optimista) de "agotado" o "visible", pensado para el teléfono. */
  const flip = async (p: Product, field: 'available' | 'active', value: boolean) => {
    if (!data) return;
    const patch = (v: boolean) =>
      setData({ ...data, products: data.products.map((x) => (x.id === p.id ? { ...x, [field]: v } : x)) });
    patch(value);
    const { error: err } = await db().from('products').update({ [field]: value }).eq('id', p.id);
    if (err) {
      patch(!value);
      toast(adminMessage(err), 'warn');
    } else if (field === 'available') {
      toast(value ? `${p.name}: disponible` : `${p.name}: agotado`);
    }
  };

  const grouped = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.categories
      .map((c) => ({ c, items: data.products.filter((p) => p.category_id === c.id && (!term || p.name.toLowerCase().includes(term))) }))
      .filter((g) => g.items.length > 0 || !term);
  }, [data, q]);

  return (
    <>
      <PageHeader
        title="Productos"
        action={
          <Link to="/dashboard/productos/nuevo" className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-4 font-semibold text-white">
            <Plus size={18} aria-hidden /> Nuevo
          </Link>
        }
      >
        Toca “Disponible” para marcar un producto como agotado al instante.
      </PageHeader>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && data.categories.length === 0 && (
        <Empty title="Primero crea una categoría">
          <Link to="/dashboard/categorias" className="font-semibold underline">
            Ir a categorías
          </Link>
        </Empty>
      )}

      {data && data.categories.length > 0 && (
        <>
          <div className="relative mb-4">
            <Search size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden />
            <Input aria-label="Buscar producto" placeholder="Buscar producto" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
          </div>

          {grouped.map(({ c, items }) => (
            <section key={c.id} className="mb-6">
              <h2 className="mb-2 font-display text-lg font-bold">
                {c.emoji} {c.name} {!c.active && <span className="text-sm font-normal text-ink-3">(categoría oculta)</span>}
              </h2>
              {items.length === 0 ? (
                <p className="text-sm text-ink-3">Sin productos.</p>
              ) : (
                <ul className="divide-y divide-line rounded-2xl border border-line bg-paper">
                  {items.map((p) => (
                    <li key={p.id} className={`flex items-center gap-3 p-3 ${!p.active ? 'opacity-55' : ''}`}>
                      <Link to={`/dashboard/productos/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                        <ProductImage src={p.image_url} alt="" className="size-12 shrink-0 rounded-xl" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{p.name}</span>
                          <span className="text-sm text-ink-2 tabular-nums">
                            {formatUsd(Number(p.price_usd))}
                            {!p.active && ' · oculto'}
                            {p.type === 'combo' && ' · combo'}
                          </span>
                        </span>
                      </Link>
                      <div className="flex flex-col items-center gap-1">
                        <Toggle checked={p.available} onChange={(v) => void flip(p, 'available', v)} label={`${p.name} disponible`} />
                        <span className={`text-[11px] font-semibold ${p.available ? 'text-send' : 'text-danger'}`}>
                          {p.available ? 'Disponible' : 'Agotado'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </>
      )}
    </>
  );
}
