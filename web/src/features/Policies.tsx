import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useMe, useOrgData, useStore } from '../store/store';
import { can } from '../lib/rbac';
import { ago, dateTime, Empty, Field, Modal, PageHeader, Panel, Pill, RiskPill, Toggle, useToast } from '../components/ui';
import type { Policy, PolicySpec } from '../lib/types';

const blankSpec: PolicySpec = {
  cameraDisabled: false,
  screenCaptureDisabled: false,
  usbDataDisabled: false,
  installUnknownSourcesAllowed: false,
  playStoreMode: 'BLOCKLIST',
  bluetoothDisabled: false,
  wifiSsid: '',
  passwordQuality: 'NUMERIC_COMPLEX',
  passwordMinLength: 6,
  systemUpdate: 'AUTOMATIC',
  externalStorageDisabled: false,
  factoryResetDisabled: false,
};

const blank = (): Policy => ({
  id: '',
  organizationId: '',
  name: '',
  description: '',
  riskLevel: 'LOW',
  status: 'DRAFT',
  spec: { ...blankSpec },
  createdAt: '',
  updatedAt: '',
  updatedBy: '',
});

const PASSWORD_LABELS: Record<PolicySpec['passwordQuality'], string> = {
  NONE: 'Sin requisito',
  SOMETHING: 'Cualquier bloqueo',
  NUMERIC_COMPLEX: 'PIN sin secuencias',
  ALPHANUMERIC: 'Letras y números',
  COMPLEX: 'Compleja (letras, números y símbolos)',
};

/** Resumen legible de lo que restringe una política. */
function summary(s: PolicySpec): string[] {
  const out: string[] = [];
  if (s.cameraDisabled) out.push('cámara bloqueada');
  if (s.screenCaptureDisabled) out.push('sin capturas');
  if (s.usbDataDisabled) out.push('USB bloqueado');
  if (s.bluetoothDisabled) out.push('sin Bluetooth');
  if (s.playStoreMode === 'ALLOWLIST') out.push('solo apps aprobadas');
  if (s.passwordQuality !== 'NONE') out.push(`contraseña: ${PASSWORD_LABELS[s.passwordQuality].toLowerCase()}`);
  if (s.wifiSsid) out.push(`Wi-Fi ${s.wifiSsid}`);
  if (s.factoryResetDisabled) out.push('sin restablecer');
  return out;
}

export function Policies() {
  const { policies, devices } = useOrgData();
  const me = useMe()!;
  const { savePolicy, deletePolicy } = useStore();
  const toast = useToast();
  const [edit, setEdit] = useState<Policy | null>(null);
  const writable = can(me.role, 'policies.write');

  const set = <K extends keyof PolicySpec>(k: K, v: PolicySpec[K]) => setEdit((p) => (p ? { ...p, spec: { ...p.spec, [k]: v } } : p));

  return (
    <>
      <PageHeader
        title="Políticas"
        intro="Reglas que Android aplica en los equipos asignados. Lo que un equipo no admite en su modo se ignora y se muestra en su hoja de capacidades."
        actions={writable && (
          <button className="btn btn-primary" onClick={() => setEdit(blank())}>
            <Plus size={16} /> Nueva política
          </button>
        )}
      />

      {policies.length === 0 ? (
        <Panel><Empty title="Aún no hay políticas">Crea la primera para aplicarla al inscribir equipos.</Empty></Panel>
      ) : (
        <div className="space-y-4">
          {policies.map((p) => {
            const affected = devices.filter((d) => d.policyId === p.id).length;
            return (
              <Panel key={p.id}>
                <div className="flex flex-wrap items-start justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold">{p.name}</h2>
                      <RiskPill value={p.riskLevel} />
                      <Pill tone={p.status === 'ACTIVE' ? 'managed' : p.status === 'DRAFT' ? 'caution' : 'neutral'}>
                        {p.status === 'ACTIVE' ? 'Activa' : p.status === 'DRAFT' ? 'Borrador' : 'Archivada'}
                      </Pill>
                    </div>
                    <p className="mt-1 max-w-2xl text-sm text-muted">{p.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {summary(p.spec).map((s) => <Pill key={s} tone="neutral">{s}</Pill>)}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-2xl font-bold">{affected}</div>
                    <div className="text-xs text-muted">dispositivos</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-xs text-muted">
                  <span title={dateTime(p.updatedAt)}>
                    Creada {dateTime(p.createdAt)}. Modificada {ago(p.updatedAt)} por {p.updatedBy}.
                  </span>
                  {writable && (
                    <span className="flex gap-3">
                      <button className="font-semibold text-managed hover:underline" onClick={() => setEdit(structuredClone(p))}>Editar</button>
                      <button
                        className="font-semibold text-denied hover:underline"
                        onClick={() => {
                          if (!confirm(`¿Eliminar la política «${p.name}»?`)) return;
                          const r = deletePolicy(p.id);
                          r.ok ? toast('Política eliminada.') : toast(r.error, 'error');
                        }}
                      >
                        Eliminar
                      </button>
                    </span>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Editar ${edit.name}` : 'Nueva política'} width="max-w-2xl">
        {edit && (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              const r = savePolicy(edit);
              if (r.ok) {
                toast(edit.id ? 'Política guardada.' : 'Política creada.');
                setEdit(null);
              } else toast(r.error, 'error');
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required maxLength={80} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Riesgo">
                  <select className="input" value={edit.riskLevel} onChange={(e) => setEdit({ ...edit, riskLevel: e.target.value as Policy['riskLevel'] })}>
                    <option value="LOW">Bajo</option><option value="MEDIUM">Medio</option><option value="HIGH">Alto</option>
                  </select>
                </Field>
                <Field label="Estado">
                  <select className="input" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Policy['status'] })}>
                    <option value="DRAFT">Borrador</option><option value="ACTIVE">Activa</option><option value="ARCHIVED">Archivada</option>
                  </select>
                </Field>
              </div>
            </div>
            <Field label="Descripción"><textarea className="input" rows={2} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} maxLength={300} /></Field>

            <fieldset>
              <legend className="mb-1 text-sm font-bold">Hardware y datos</legend>
              <div className="divide-y divide-line rounded-md border border-line px-3">
                <Toggle label="Bloquear cámara" hint="cameraAccess · en perfil de trabajo solo afecta al perfil" checked={edit.spec.cameraDisabled} onChange={(v) => set('cameraDisabled', v)} />
                <Toggle label="Bloquear capturas de pantalla" hint="screenCaptureDisabled" checked={edit.spec.screenCaptureDisabled} onChange={(v) => set('screenCaptureDisabled', v)} />
                <Toggle label="Bloquear datos por USB" hint="usbDataAccess · bloqueo completo desde Android 12" checked={edit.spec.usbDataDisabled} onChange={(v) => set('usbDataDisabled', v)} />
                <Toggle label="Bloquear almacenamiento externo" hint="DISALLOW_MOUNT_PHYSICAL_MEDIA" checked={edit.spec.externalStorageDisabled} onChange={(v) => set('externalStorageDisabled', v)} />
                <Toggle label="Bloquear Bluetooth" hint="bluetoothDisabled" checked={edit.spec.bluetoothDisabled} onChange={(v) => set('bluetoothDisabled', v)} />
                <Toggle label="Impedir restablecer de fábrica" hint="factoryResetDisabled · solo Device Owner" checked={edit.spec.factoryResetDisabled} onChange={(v) => set('factoryResetDisabled', v)} />
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-1 text-sm font-bold">Aplicaciones</legend>
              <div className="divide-y divide-line rounded-md border border-line px-3">
                <Toggle label="Permitir apps de orígenes desconocidos" hint="installUnknownSourcesAllowed" checked={edit.spec.installUnknownSourcesAllowed} onChange={(v) => set('installUnknownSourcesAllowed', v)} />
                <Toggle label="Solo apps aprobadas en el catálogo" hint="playStoreMode WHITELIST; si está apagado, se bloquean solo las marcadas" checked={edit.spec.playStoreMode === 'ALLOWLIST'} onChange={(v) => set('playStoreMode', v ? 'ALLOWLIST' : 'BLOCKLIST')} />
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Contraseña">
                <select className="input" value={edit.spec.passwordQuality} onChange={(e) => set('passwordQuality', e.target.value as PolicySpec['passwordQuality'])}>
                  {Object.entries(PASSWORD_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </Field>
              <Field label="Longitud mínima"><input type="number" min={0} max={16} className="input" value={edit.spec.passwordMinLength} onChange={(e) => set('passwordMinLength', Number(e.target.value))} /></Field>
              <Field label="Actualizaciones">
                <select className="input" value={edit.spec.systemUpdate} onChange={(e) => set('systemUpdate', e.target.value as PolicySpec['systemUpdate'])}>
                  <option value="AUTOMATIC">Automáticas</option><option value="WINDOWED">En ventana nocturna</option><option value="POSTPONE">Posponer 30 días</option>
                </select>
              </Field>
            </div>
            <Field label="Red Wi-Fi corporativa (SSID)" hint="openNetworkConfiguration. La contraseña de la red se gestiona en el backend, nunca en el navegador.">
              <input className="input" value={edit.spec.wifiSsid} onChange={(e) => set('wifiSsid', e.target.value)} maxLength={32} />
            </Field>

            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <button type="button" className="btn" onClick={() => setEdit(null)}>Cancelar</button>
              <button className="btn btn-primary">{edit.id ? 'Guardar cambios' : 'Crear política'}</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
