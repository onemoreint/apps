import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useMe, useOrgData, useStore } from '../store/store';
import { can } from '../lib/rbac';
import { Empty, Field, Modal, PageHeader, Panel, Pill, useToast } from '../components/ui';
import type { ConfigType, ManagedConfigEntry } from '../lib/types';

const TYPE_LABELS: Record<ConfigType, string> = {
  STRING: 'Texto',
  BOOL: 'Sí / No',
  INTEGER: 'Entero',
  FLOAT: 'Decimal',
  STRING_ARRAY: 'Lista de textos',
};

function show(e: ManagedConfigEntry): string {
  if (e.type === 'BOOL') return e.value ? 'Sí' : 'No';
  if (e.type === 'STRING_ARRAY') return (e.value as string[]).join(', ');
  return String(e.value);
}

/** Convierte el texto del formulario al tipo declarado; devuelve error si no encaja. */
export function parseValue(type: ConfigType, raw: string): { value: ManagedConfigEntry['value'] } | { error: string } {
  const t = raw.trim();
  switch (type) {
    case 'STRING':
      return { value: raw };
    case 'BOOL':
      if (t === 'true' || t === 'false') return { value: t === 'true' };
      return { error: 'Elige Sí o No.' };
    case 'INTEGER':
      return /^-?\d+$/.test(t) && Number.isSafeInteger(Number(t)) ? { value: Number(t) } : { error: 'Escribe un número entero, por ejemplo 15.' };
    case 'FLOAT':
      return t !== '' && Number.isFinite(Number(t.replace(',', '.'))) ? { value: Number(t.replace(',', '.')) } : { error: 'Escribe un número, por ejemplo 2.5.' };
    case 'STRING_ARRAY':
      return { value: raw.split(/\n|,/).map((x) => x.trim()).filter(Boolean) };
  }
}

export function ManagedConfigs() {
  const { applications } = useOrgData();
  const me = useMe()!;
  const { saveConfigEntry, deleteConfigEntry } = useStore();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const appId = params.get('app') ?? applications[0]?.id ?? '';
  const app = applications.find((a) => a.id === appId);
  const writable = can(me.role, 'apps.write');
  const [edit, setEdit] = useState<(ManagedConfigEntry & { raw: string }) | null>(null);

  return (
    <>
      <PageHeader
        title="Configuraciones administradas"
        intro="Valores que la app recibe al instalarse o cuando cambian, sin que la persona tenga que configurarla. La app debe declararlos en su app_restrictions.xml."
      />
      {applications.length === 0 ? (
        <Panel><Empty title="No hay apps en el catálogo">Agrega una app en la sección Aplicaciones.</Empty></Panel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <Panel title="Aplicación">
            <ul>
              {applications.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => setParams({ app: a.id })}
                    className={`flex w-full items-center justify-between border-b border-line px-4 py-2.5 text-left text-sm last:border-0 ${a.id === appId ? 'bg-managed-soft font-semibold' : 'hover:bg-paper'}`}
                  >
                    {a.name}
                    <span className="text-xs text-muted">{a.managedConfig.length}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          {app && (
            <Panel
              title={`${app.name} · ${app.packageName}`}
              aside={writable && (
                <button className="btn !py-1 text-xs" onClick={() => setEdit({ id: '', key: '', name: '', description: '', type: 'STRING', value: '', raw: '' })}>
                  <Plus size={14} /> Nueva clave
                </button>
              )}
            >
              {app.managedConfig.length === 0 ? (
                <Empty title="Esta app aún no tiene configuraciones">Añade una clave que la app espere recibir, por ejemplo server_url.</Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="grid-table">
                    <thead>
                      <tr><th>Nombre</th><th>Clave</th><th>Tipo</th><th>Valor</th>{writable && <th />}</tr>
                    </thead>
                    <tbody>
                      {app.managedConfig.map((e) => (
                        <tr key={e.id}>
                          <td><div className="font-semibold">{e.name}</div><div className="text-xs text-muted">{e.description}</div></td>
                          <td><code className="rounded bg-paper px-1.5 py-0.5 text-xs">{e.key}</code></td>
                          <td><Pill tone="neutral">{TYPE_LABELS[e.type]}</Pill></td>
                          <td className="max-w-56 break-words">{show(e)}</td>
                          {writable && (
                            <td className="whitespace-nowrap text-right">
                              <button className="mr-3 text-sm font-semibold text-managed hover:underline" onClick={() => setEdit({ ...e, raw: e.type === 'STRING_ARRAY' ? (e.value as string[]).join('\n') : String(e.value) })}>Editar</button>
                              <button className="text-sm font-semibold text-denied hover:underline" onClick={() => { const r = deleteConfigEntry(app.id, e.id); r.ok ? toast('Clave eliminada.') : toast(r.error, 'error'); }}>Eliminar</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <details className="border-t border-line px-4 py-3 text-sm">
                <summary className="cursor-pointer font-semibold">Así lo recibe la app (Bundle de RestrictionsManager)</summary>
                <pre className="mt-2 overflow-x-auto rounded bg-paper p-3 text-xs">
                  {JSON.stringify(Object.fromEntries(app.managedConfig.map((e) => [e.key, e.value])), null, 2)}
                </pre>
              </details>
            </Panel>
          )}
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Editar ${edit.key}` : 'Nueva clave'}>
        {edit && app && (
          <form
            className="space-y-4"
            onSubmit={(ev) => {
              ev.preventDefault();
              const parsed = parseValue(edit.type, edit.raw);
              if ('error' in parsed) return toast(parsed.error, 'error');
              const { raw: _raw, ...entry } = edit;
              void _raw;
              const r = saveConfigEntry(app.id, { ...entry, value: parsed.value });
              if (r.ok) { toast('Configuración guardada. Se entregará en la próxima sincronización.'); setEdit(null); }
              else toast(r.error, 'error');
            }}
          >
            <Field label="Nombre"><input className="input" required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Descripción"><input className="input" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Clave" hint="minúsculas y guion bajo"><input className="input" required value={edit.key} onChange={(e) => setEdit({ ...edit, key: e.target.value })} /></Field>
              <Field label="Tipo">
                <select className="input" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value as ConfigType, raw: e.target.value === 'BOOL' ? 'true' : '' })}>
                  {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Valor" hint={edit.type === 'STRING_ARRAY' ? 'Un elemento por línea' : undefined}>
              {edit.type === 'BOOL' ? (
                <select className="input" value={edit.raw} onChange={(e) => setEdit({ ...edit, raw: e.target.value })}>
                  <option value="true">Sí</option><option value="false">No</option>
                </select>
              ) : edit.type === 'STRING_ARRAY' ? (
                <textarea className="input" rows={4} value={edit.raw} onChange={(e) => setEdit({ ...edit, raw: e.target.value })} />
              ) : (
                <input className="input" inputMode={edit.type === 'STRING' ? 'text' : 'decimal'} value={edit.raw} onChange={(e) => setEdit({ ...edit, raw: e.target.value })} />
              )}
            </Field>
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <button type="button" className="btn" onClick={() => setEdit(null)}>Cancelar</button>
              <button className="btn btn-primary">Guardar</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
