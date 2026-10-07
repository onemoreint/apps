import { useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus } from 'lucide-react';
import { db } from '@/shared/lib/supabase';
import { adminMessage } from '@/shared/lib/errors';
import { toast } from '@/shared/ui/Toast';
import { Sheet } from '@/shared/ui/Sheet';
import { useAdmin } from '../AdminContext';
import { must, useLoad } from '../lib';
import type { Category, OptionGroup } from '../types';
import { Button, Empty, ErrorBox, Field, Input, Loading, PageHeader, Toggle } from '../ui';

interface Draft {
  id?: string;
  name: string;
  emoji: string;
  active: boolean;
  groupIds: string[];
}

export default function CategoriesPage() {
  const { business } = useAdmin();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, setData, error, loading, reload } = useLoad(async () => {
    const [cats, groups, links] = await Promise.all([
      db().from('categories').select('*').eq('business_id', business.id).order('sort_order').order('name'),
      db().from('option_groups').select('*').eq('business_id', business.id).order('sort_order'),
      db().from('category_option_groups').select('category_id, group_id').eq('business_id', business.id),
    ]);
    return {
      categories: must(cats) as Category[],
      groups: must(groups) as OptionGroup[],
      links: must(links) as { category_id: string; group_id: string }[],
    };
  }, [business.id]);

  const open = (c?: Category) =>
    setDraft(
      c
        ? { id: c.id, name: c.name, emoji: c.emoji ?? '', active: c.active, groupIds: data!.links.filter((l) => l.category_id === c.id).map((l) => l.group_id) }
        : { name: '', emoji: '', active: true, groupIds: [] },
    );

  const save = async () => {
    if (!draft || !data || !draft.name.trim()) return;
    setSaving(true);
    try {
      const c = db();
      const row = { business_id: business.id, name: draft.name.trim().slice(0, 60), emoji: draft.emoji.trim().slice(0, 16) || null, active: draft.active };
      const saved = must(
        draft.id
          ? await c.from('categories').update(row).eq('id', draft.id).select().single()
          : await c
              .from('categories')
              .insert({ ...row, sort_order: Math.max(0, ...data.categories.map((x) => x.sort_order)) + 1 })
              .select()
              .single(),
      ) as Category;
      must(await c.from('category_option_groups').delete().eq('category_id', saved.id));
      if (draft.groupIds.length) {
        must(
          await c
            .from('category_option_groups')
            .insert(draft.groupIds.map((g, i) => ({ category_id: saved.id, group_id: g, business_id: business.id, sort_order: i }))),
        );
      }
      toast(draft.id ? 'Categoría actualizada' : 'Categoría creada');
      setDraft(null);
      void reload();
    } catch (e) {
      toast(adminMessage(e), 'warn');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft?.id || !confirm(`¿Eliminar la categoría "${draft.name}"? Solo es posible si no tiene productos.`)) return;
    const { error: err } = await db().from('categories').delete().eq('id', draft.id);
    if (err) toast(err.code === '23503' ? 'Esta categoría tiene productos. Muévelos u ocúltala en su lugar.' : adminMessage(err), 'warn');
    else {
      toast('Categoría eliminada');
      setDraft(null);
      void reload();
    }
  };

  /** Intercambia el orden con la vecina (arriba/abajo). */
  const move = async (i: number, dir: -1 | 1) => {
    if (!data) return;
    const list = [...data.categories];
    const a = list[i];
    const b = list[i + dir];
    if (!a || !b) return;
    list[i] = b;
    list[i + dir] = a;
    const renumbered = list.map((c, idx) => ({ ...c, sort_order: idx + 1 }));
    setData({ ...data, categories: renumbered });
    const results = await Promise.all(
      [renumbered[i]!, renumbered[i + dir]!].map((c) => db().from('categories').update({ sort_order: c.sort_order }).eq('id', c.id)),
    );
    const failed = results.find((r) => r.error);
    if (failed) {
      toast(adminMessage(failed.error), 'warn');
      void reload();
    }
  };

  const flipActive = async (c: Category, v: boolean) => {
    if (!data) return;
    setData({ ...data, categories: data.categories.map((x) => (x.id === c.id ? { ...x, active: v } : x)) });
    const { error: err } = await db().from('categories').update({ active: v }).eq('id', c.id);
    if (err) {
      toast(adminMessage(err), 'warn');
      void reload();
    }
  };

  return (
    <>
      <PageHeader
        title="Categorías"
        action={
          <Button onClick={() => open()} disabled={!data}>
            <Plus size={18} aria-hidden /> Nueva
          </Button>
        }
      >
        El orden de esta lista es el orden del menú.
      </PageHeader>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && data.categories.length === 0 && <Empty title="Sin categorías">Crea la primera, por ejemplo “Hamburguesas”.</Empty>}
      {data && data.categories.length > 0 && (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-paper">
          {data.categories.map((c, i) => (
            <li key={c.id} className="flex items-center gap-2 p-3">
              <div className="flex flex-col">
                <button type="button" className="grid size-8 place-items-center rounded-lg disabled:opacity-25" disabled={i === 0} onClick={() => void move(i, -1)} aria-label={`Subir ${c.name}`}>
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  className="grid size-8 place-items-center rounded-lg disabled:opacity-25"
                  disabled={i === data.categories.length - 1}
                  onClick={() => void move(i, 1)}
                  aria-label={`Bajar ${c.name}`}
                >
                  <ArrowDown size={16} />
                </button>
              </div>
              <span className={`flex-1 font-semibold ${!c.active ? 'text-ink-3' : ''}`}>
                {c.emoji} {c.name}
              </span>
              <Toggle checked={c.active} onChange={(v) => void flipActive(c, v)} label={`Mostrar ${c.name}`} />
              <Button variant="ghost" onClick={() => open(c)} aria-label={`Editar ${c.name}`}>
                <Pencil size={18} aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {draft && data && (
        <Sheet
          open
          onClose={() => setDraft(null)}
          title={draft.id ? 'Editar categoría' : 'Nueva categoría'}
          footer={
            <div className="flex gap-2">
              <Button busy={saving} disabled={!draft.name.trim()} onClick={() => void save()} className="flex-1">
                Guardar
              </Button>
              {draft.id && (
                <Button variant="danger" onClick={() => void remove()}>
                  Eliminar
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-4 pb-2">
            <div className="grid grid-cols-[5rem_1fr] gap-3">
              <Field label="Emoji" htmlFor="emoji">
                <Input id="emoji" value={draft.emoji} maxLength={16} className="text-center text-xl" onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} />
              </Field>
              <Field label="Nombre" htmlFor="cname">
                <Input id="cname" value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </Field>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Visible en el menú</span>
              <Toggle checked={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} label="Visible en el menú" />
            </div>
            {data.groups.length > 0 && (
              <fieldset>
                <legend className="mb-1 text-sm font-semibold">Opciones para todos sus productos</legend>
                {data.groups.map((g) => (
                  <label key={g.id} className="flex min-h-11 items-center gap-3">
                    <input
                      type="checkbox"
                      className="size-5 accent-[var(--brand)]"
                      checked={draft.groupIds.includes(g.id)}
                      onChange={(e) =>
                        setDraft({ ...draft, groupIds: e.target.checked ? [...draft.groupIds, g.id] : draft.groupIds.filter((x) => x !== g.id) })
                      }
                    />
                    {g.name}
                  </label>
                ))}
              </fieldset>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}
