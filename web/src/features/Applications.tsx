import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useMe, useOrgData, useStore } from '../store/store';
import { can } from '../lib/rbac';
import { Empty, Field, Modal, PageHeader, Panel, Pill, useToast } from '../components/ui';
import type { Application, InstallType } from '../lib/types';

export const INSTALL_LABELS: Record<InstallType, string> = {
  AVAILABLE: 'Disponible',
  FORCE_INSTALLED: 'Instalación obligatoria',
  BLOCKED: 'Bloqueada',
  KIOSK: 'Quiosco',
};

const INSTALL_HINT: Record<InstallType, string> = {
  AVAILABLE: 'La persona puede instalarla desde Managed Google Play.',
  FORCE_INSTALLED: 'Se instala sin intervención en modos que lo permiten (perfil de trabajo, totalmente administrado).',
  BLOCKED: 'Se impide instalarla o se oculta si ya existe.',
  KIOSK: 'Se fija en pantalla en equipos dedicados.',
};

export function Applications() {
  const { applications, devices } = useOrgData();
  const me = useMe()!;
  const { saveApp, deleteApp } = useStore();
  const toast = useToast();
  const [edit, setEdit] = useState<Application | null>(null);
  const writable = can(me.role, 'apps.write');

  return (
    <>
      <PageHeader
        title="Aplicaciones"
        intro="Catálogo de apps administradas. La instalación silenciosa solo ocurre donde Android la permite."
        actions={writable && (
          <button
            className="btn btn-primary"
            onClick={() => setEdit({ id: '', organizationId: '', name: '', packageName: '', version: '', installType: 'AVAILABLE', permissions: [], managedConfig: [] })}
          >
            <Plus size={16} /> Agregar aplicación
          </button>
        )}
      />
      <Panel className="overflow-hidden">
        {applications.length === 0 ? (
          <Empty title="El catálogo está vacío">Agrega la primera app por su package name.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Aplicación</th>
                  <th>Versión</th>
                  <th>Estado</th>
                  <th>Permisos</th>
                  <th>Config. administrada</th>
                  <th>Instalada en</th>
                  {writable && <th />}
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => {
                  const installed = devices.filter((d) => d.installedPackages.includes(a.packageName)).length;
                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="font-semibold">{a.name}</div>
                        <div className="text-xs text-muted">{a.packageName}</div>
                      </td>
                      <td className="tabular-nums">{a.version || '—'}</td>
                      <td>
                        <Pill tone={a.installType === 'BLOCKED' ? 'denied' : a.installType === 'FORCE_INSTALLED' ? 'managed' : a.installType === 'KIOSK' ? 'spruce' : 'neutral'}>
                          {INSTALL_LABELS[a.installType]}
                        </Pill>
                      </td>
                      <td className="max-w-48 text-xs text-muted">{a.permissions.length ? a.permissions.join(', ') : '—'}</td>
                      <td>
                        <Link to={`/managed-configs?app=${a.id}`} className="text-managed hover:underline">
                          {a.managedConfig.length ? `${a.managedConfig.length} claves` : 'Configurar'}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap">{installed} equipos</td>
                      {writable && (
                        <td className="whitespace-nowrap text-right">
                          <button className="mr-3 text-sm font-semibold text-managed hover:underline" onClick={() => setEdit(structuredClone(a))}>Editar</button>
                          <button
                            className="text-sm font-semibold text-denied hover:underline"
                            onClick={() => {
                              if (!confirm(`¿Quitar ${a.name} del catálogo? No se desinstala de los equipos.`)) return;
                              const r = deleteApp(a.id);
                              r.ok ? toast('Aplicación quitada del catálogo.') : toast(r.error, 'error');
                            }}
                          >
                            Quitar
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Editar ${edit.name}` : 'Agregar aplicación'}>
        {edit && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const r = saveApp(edit);
              if (r.ok) {
                toast(edit.id ? 'Aplicación guardada.' : 'Aplicación agregada al catálogo.');
                setEdit(null);
              } else toast(r.error, 'error');
            }}
          >
            <Field label="Nombre"><input className="input" required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Package name" hint="El identificador de la app en Google Play, por ejemplo com.empresa.app">
              <input className="input" required value={edit.packageName} disabled={!!edit.id} onChange={(e) => setEdit({ ...edit, packageName: e.target.value.trim() })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Versión"><input className="input" value={edit.version} onChange={(e) => setEdit({ ...edit, version: e.target.value })} /></Field>
              <Field label="Estado">
                <select className="input" value={edit.installType} onChange={(e) => setEdit({ ...edit, installType: e.target.value as InstallType })}>
                  {Object.entries(INSTALL_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </Field>
            </div>
            <p className="text-xs text-muted">{INSTALL_HINT[edit.installType]}</p>
            <Field label="Permisos" hint="Separados por comas, por ejemplo CAMERA, ACCESS_FINE_LOCATION">
              <input className="input" value={edit.permissions.join(', ')} onChange={(e) => setEdit({ ...edit, permissions: e.target.value.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean) })} />
            </Field>
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <button type="button" className="btn" onClick={() => setEdit(null)}>Cancelar</button>
              <button className="btn btn-primary">{edit.id ? 'Guardar cambios' : 'Agregar aplicación'}</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
