import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { db } from '@/shared/lib/supabase';
import { adminMessage } from '@/shared/lib/errors';
import { formatUsd } from '@/shared/lib/money';
import { toast } from '@/shared/ui/Toast';
import { Sheet } from '@/shared/ui/Sheet';
import { useAdmin } from '../AdminContext';
import { must, useLoad } from '../lib';
import type { Option, OptionGroup } from '../types';
import { Button, Card, Empty, ErrorBox, Field, Input, Loading, PageHeader, Select, Toggle } from '../ui';

interface GroupDraft {
  id?: string;
  name: string;
  selection: 'single' | 'multiple';
  required: boolean;
  max: string;
  active: boolean;
}

const rule = (g: OptionGroup) =>
  g.selection === 'single'
    ? g.min_select > 0
      ? 'Obligatorio, elige 1'
      : 'Opcional, elige 1'
    : g.min_select > 0
      ? `Obligatorio, de ${g.min_select} a ${g.max_select}`
      : `Opcional, hasta ${g.max_select}`;

export default function OptionsPage() {
  const { business } = useAdmin();
  const [draft, setDraft] = useState<GroupDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, error, loading, reload } = useLoad(async () => {
    const groups = must(await db().from('option_groups').select('*').eq('business_id', business.id).order('sort_order').order('name')) as OptionGroup[];
    const options = groups.length
      ? (must(await db().from('options').select('*').in('group_id', groups.map((g) => g.id)).order('sort_order').order('name')) as Option[])
      : [];
    return { groups, options };
  }, [business.id]);

  const saveGroup = async () => {
    if (!draft || !data || !draft.name.trim()) return;
    const max = draft.selection === 'single' ? 1 : Math.max(1, Math.min(20, parseInt(draft.max, 10) || 1));
    const row = {
      business_id: business.id,
      name: draft.name.trim().slice(0, 60),
      selection: draft.selection,
      min_select: draft.required ? 1 : 0,
      max_select: max,
      active: draft.active,
    };
    setSaving(true);
    try {
      must(
        draft.id
          ? await db().from('option_groups').update(row).eq('id', draft.id)
          : await db().from('option_groups').insert({ ...row, sort_order: Math.max(0, ...data.groups.map((g) => g.sort_order)) + 1 }),
      );
      toast('Grupo guardado');
      setDraft(null);
      void reload();
    } catch (e) {
      toast(adminMessage(e), 'warn');
    } finally {
      setSaving(false);
    }
  };

  const removeGroup = async () => {
    if (!draft?.id || !confirm(`¿Eliminar el grupo "${draft.name}" y todas sus opciones?`)) return;
    const { error: err } = await db().from('option_groups').delete().eq('id', draft.id);
    if (err) toast(adminMessage(err), 'warn');
    else {
      setDraft(null);
      void reload();
    }
  };

  return (
    <>
      <PageHeader
        title="Extras y opciones"
        action={
          <Button onClick={() => setDraft({ name: '', selection: 'multiple', required: false, max: '4', active: true })}>
            <Plus size={18} aria-hidden /> Nuevo grupo
          </Button>
        }
      >
        Crea grupos como “Extras” o “Quitar ingredientes” y asígnalos a categorías o productos.
      </PageHeader>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && data.groups.length === 0 && <Empty title="Sin grupos de opciones">Crea “Extras” con queso, tocineta y carne.</Empty>}

      <div className="space-y-4">
        {data?.groups.map((g) => (
          <Card key={g.id} className={g.active ? '' : 'opacity-60'}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold">{g.name}</h2>
                <p className="text-sm text-ink-3">
                  {rule(g)}
                  {!g.active && ' · oculto'}
                </p>
              </div>
              <Button
                variant="ghost"
                aria-label={`Editar ${g.name}`}
                onClick={() =>
                  setDraft({ id: g.id, name: g.name, selection: g.selection, required: g.min_select > 0, max: String(g.max_select), active: g.active })
                }
              >
                <Pencil size={18} aria-hidden />
              </Button>
            </div>
            <OptionList group={g} options={data.options.filter((o) => o.group_id === g.id)} onChanged={reload} />
          </Card>
        ))}
      </div>

      {draft && (
        <Sheet
          open
          onClose={() => setDraft(null)}
          title={draft.id ? 'Editar grupo' : 'Nuevo grupo'}
          footer={
            <div className="flex gap-2">
              <Button busy={saving} disabled={!draft.name.trim()} onClick={() => void saveGroup()} className="flex-1">
                Guardar
              </Button>
              {draft.id && (
                <Button variant="danger" onClick={() => void removeGroup()}>
                  Eliminar
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-4 pb-2">
            <Field label="Nombre" htmlFor="gname">
              <Input id="gname" value={draft.name} maxLength={60} placeholder="Ej.: Extras" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label="El cliente puede elegir" htmlFor="gsel">
              <Select id="gsel" value={draft.selection} onChange={(e) => setDraft({ ...draft, selection: e.target.value as GroupDraft['selection'] })}>
                <option value="multiple">Varias opciones</option>
                <option value="single">Solo una (ej.: tamaño)</option>
              </Select>
            </Field>
            {draft.selection === 'multiple' && (
              <Field label="Máximo de opciones" htmlFor="gmax">
                <Input id="gmax" inputMode="numeric" value={draft.max} onChange={(e) => setDraft({ ...draft, max: e.target.value })} />
              </Field>
            )}
            <div className="flex items-center justify-between">
              <span className="font-medium">Obligatorio elegir</span>
              <Toggle checked={draft.required} onChange={(v) => setDraft({ ...draft, required: v })} label="Obligatorio elegir" />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Activo</span>
              <Toggle checked={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} label="Activo" />
            </div>
          </div>
        </Sheet>
      )}
    </>
  );
}

function OptionList({ group, options, onChanged }: { group: OptionGroup; options: Option[]; onChanged: () => void }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const delta = price.trim() ? Number(price.replace(',', '.')) : 0;
    if (!name.trim() || !Number.isFinite(delta) || delta < 0) {
      toast('Escribe un nombre y un precio válido (0 si es gratis).', 'warn');
      return;
    }
    setBusy(true);
    const { error } = await db()
      .from('options')
      .insert({ group_id: group.id, name: name.trim().slice(0, 60), price_delta_usd: Math.round(delta * 100) / 100, sort_order: options.length + 1 });
    setBusy(false);
    if (error) toast(adminMessage(error), 'warn');
    else {
      setName('');
      setPrice('');
      onChanged();
    }
  };

  const update = async (o: Option, patch: Partial<Option>) => {
    const { error } = await db().from('options').update(patch).eq('id', o.id);
    if (error) toast(adminMessage(error), 'warn');
    onChanged();
  };

  const remove = async (o: Option) => {
    if (!confirm(`¿Eliminar "${o.name}"?`)) return;
    const { error } = await db().from('options').delete().eq('id', o.id);
    if (error) toast(adminMessage(error), 'warn');
    onChanged();
  };

  return (
    <div className="mt-3">
      <ul className="divide-y divide-line">
        {options.map((o) => (
          <li key={o.id} className="flex min-h-12 items-center gap-3 py-1.5">
            <span className={`flex-1 ${o.available ? '' : 'text-ink-3 line-through'}`}>{o.name}</span>
            <PriceEdit value={Number(o.price_delta_usd)} onSave={(v) => void update(o, { price_delta_usd: v })} label={o.name} />
            <Toggle checked={o.available} onChange={(v) => void update(o, { available: v })} label={`${o.name} disponible`} />
            <button type="button" className="grid size-9 place-items-center text-ink-3" onClick={() => void remove(o)} aria-label={`Eliminar ${o.name}`}>
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <Input aria-label="Nueva opción" placeholder="Nueva opción" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        <Input aria-label="Precio adicional" placeholder="+$0" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="w-20" />
        <Button variant="secondary" busy={busy} onClick={() => void add()} aria-label="Agregar opción">
          <Plus size={18} aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function PriceEdit({ value, onSave, label }: { value: number; onSave: (v: number) => void; label: string }) {
  const [v, setV] = useState(value ? String(value) : '');
  const commit = () => {
    const n = v.trim() ? Number(v.replace(',', '.')) : 0;
    if (!Number.isFinite(n) || n < 0) {
      setV(value ? String(value) : '');
      return;
    }
    if (Math.round(n * 100) !== Math.round(value * 100)) onSave(Math.round(n * 100) / 100);
  };
  return (
    <input
      aria-label={`Precio adicional de ${label}`}
      inputMode="decimal"
      value={v}
      placeholder="Gratis"
      title={value ? `+${formatUsd(value)}` : 'Gratis'}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className="h-9 w-20 rounded-lg border border-line px-2 text-right tabular-nums outline-none focus:border-ink"
    />
  );
}
