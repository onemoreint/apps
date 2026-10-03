import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useMe, useOrgData, useStore } from '../store/store';
import {
  capabilitiesFor,
  COMMAND_LABELS,
  commandBlockReason,
  CONFIRM_COMMANDS,
  MODE_DESCRIPTIONS,
  MODE_LABELS,
} from '../lib/capabilities';
import { can, commandPermission } from '../lib/rbac';
import {
  ago,
  CapabilityMark,
  CompliancePill,
  dateTime,
  Modal,
  PageHeader,
  Panel,
  Pill,
  StatePill,
  useToast,
} from '../components/ui';
import type { CommandType, Device } from '../lib/types';
import { CommandStatusPill } from './Commands';

const COMMANDS: CommandType[] = [
  'SYNC_NOW',
  'GET_DEVICE_INFO',
  'SYNC_POLICY',
  'SYNC_APPLICATIONS',
  'REFRESH_CONFIGURATION',
  'LOCK_DEVICE',
  'REBOOT_DEVICE',
  'WIPE_DEVICE',
];

const CONFIRM_TEXT: Partial<Record<CommandType, string>> = {
  LOCK_DEVICE: 'La pantalla se bloqueará y la persona usuaria tendrá que desbloquear con su PIN o contraseña.',
  REBOOT_DEVICE: 'El equipo se reiniciará de inmediato. Se perderá el trabajo que no esté guardado.',
  WIPE_DEVICE: 'Se borrarán todos los datos y el equipo volverá a los ajustes de fábrica. Esta acción no se puede deshacer.',
};

export function DeviceDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const me = useMe()!;
  const toast = useToast();
  const { devices, policies, commands, audit, applications } = useOrgData();
  const { issueCommand, assignPolicy, setTags, retireDevice, deleteDevice } = useStore();
  const d = devices.find((x) => x.id === id);

  const [confirm, setConfirm] = useState<CommandType | null>(null);
  const [wipeStep, setWipeStep] = useState<1 | 2>(1);
  const [typed, setTyped] = useState('');
  const [tagText, setTagText] = useState<string | null>(null);
  const [retireOpen, setRetireOpen] = useState(false);

  if (!d)
    return (
      <Panel>
        <div className="p-8">
          <p className="font-semibold">Este dispositivo no existe en tu organización.</p>
          <Link to="/devices" className="mt-2 inline-block text-sm font-semibold text-managed">
            Volver a dispositivos
          </Link>
        </div>
      </Panel>
    );

  const caps = capabilitiesFor(d.mode, d.sdkInt);
  const counts = {
    SUPPORTED: caps.filter((c) => c.status === 'SUPPORTED').length,
    PARTIAL: caps.filter((c) => c.status === 'PARTIAL').length,
    UNSUPPORTED: caps.filter((c) => c.status === 'UNSUPPORTED').length,
  };
  const devCommands = commands.filter((c) => c.deviceId === d.id).slice(0, 8);
  const devEvents = audit.filter((e) => e.deviceId === d.id).slice(0, 8);
  const managedApps = applications.filter((a) => d.installedPackages.includes(a.packageName));

  const run = (type: CommandType) => {
    const res = issueCommand(d.id, type);
    if (res.ok) toast(`${COMMAND_LABELS[type]}: comando enviado a ${d.name}.`);
    else toast(res.error, 'error');
  };
  const onCommand = (type: CommandType) => {
    if (CONFIRM_COMMANDS.includes(type)) {
      setConfirm(type);
      setWipeStep(1);
      setTyped('');
    } else run(type);
  };
  const closeConfirm = () => setConfirm(null);

  const info: [string, ReactNode][] = [
    ['Fabricante', d.manufacturer],
    ['Modelo', d.model],
    ['Android', `${d.androidVersion} (SDK ${d.sdkInt})`],
    ['Número de serie', d.serial ?? <span className="text-muted">No accesible en este modo</span>],
    ['Batería', d.state === 'PENDING' ? '—' : `${d.batteryPct} %`],
    ['Almacenamiento libre', `${d.storageFreeGb} de ${d.storageTotalGb} GB`],
    ['Memoria libre', `${(d.memoryFreeMb / 1024).toFixed(1)} GB`],
    ['Agente', d.agentVersion],
    ['Inscrito', dateTime(d.enrolledAt)],
    ['Última sincronización', d.state === 'PENDING' ? 'nunca' : `${ago(d.lastSeenAt)}`],
  ];

  return (
    <>
      <Link to="/devices" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Dispositivos
      </Link>
      <PageHeader
        title={d.name}
        intro={`${d.manufacturer} ${d.model} · ${MODE_LABELS[d.mode]}`}
        actions={
          <div className="flex items-center gap-2">
            <StatePill state={d.state} />
            <CompliancePill value={d.compliance} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-6">
          <Panel title="Inventario">
            <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              {info.map(([k, v]) => (
                <div key={k} className="border-b border-line px-4 py-2.5">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="text-sm font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="px-4 py-3 text-xs text-muted">
              No se recogen ubicación, contactos, mensajes ni apps personales.
            </p>
          </Panel>

          <Panel title="Política y etiquetas">
            <div className="space-y-4 p-4">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Política aplicada</span>
                <select
                  className="input"
                  value={d.policyId ?? ''}
                  disabled={!can(me.role, 'policies.assign') || d.state === 'RETIRED'}
                  onChange={(e) => {
                    const r = assignPolicy(d.id, e.target.value || null);
                    r.ok ? toast('Política asignada. Se aplicará en la próxima sincronización.') : toast(r.error, 'error');
                  }}
                >
                  <option value="">Sin política</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.status === 'DRAFT' ? ' (borrador)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="mb-1 block text-sm font-semibold">Etiquetas</span>
                {tagText === null ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {d.tags.map((t) => (
                      <Pill key={t} tone="neutral">
                        {t}
                      </Pill>
                    ))}
                    {can(me.role, 'devices.write') && (
                      <button className="text-xs font-semibold text-managed hover:underline" onClick={() => setTagText(d.tags.join(', '))}>
                        Editar etiquetas
                      </button>
                    )}
                  </div>
                ) : (
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const r = setTags(d.id, tagText.split(','));
                      r.ok ? setTagText(null) : toast(r.error, 'error');
                    }}
                  >
                    <input className="input" value={tagText} onChange={(e) => setTagText(e.target.value)} aria-label="Etiquetas separadas por comas" />
                    <button className="btn btn-primary">Guardar</button>
                    <button type="button" className="btn" onClick={() => setTagText(null)}>
                      Cancelar
                    </button>
                  </form>
                )}
              </div>
            </div>
          </Panel>

          <Panel title="Aplicaciones administradas">
            {managedApps.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">Ninguna app del catálogo está instalada.</p>
            ) : (
              <ul className="divide-y divide-line">
                {managedApps.map((a) => (
                  <li key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span>
                      <span className="font-semibold">{a.name}</span>
                      <span className="block text-xs text-muted">{a.packageName}</span>
                    </span>
                    <span className="text-xs text-muted">{a.version}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title="Capacidades del dispositivo"
            aside={
              <span className="flex items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1"><CapabilityMark status="SUPPORTED" size={12} /> {counts.SUPPORTED}</span>
                <span className="flex items-center gap-1"><CapabilityMark status="PARTIAL" size={12} /> {counts.PARTIAL}</span>
                <span className="flex items-center gap-1"><CapabilityMark status="UNSUPPORTED" size={12} /> {counts.UNSUPPORTED}</span>
              </span>
            }
          >
            <p className="border-b border-line bg-paper/60 px-4 py-3 text-sm">{MODE_DESCRIPTIONS[d.mode]}</p>
            <ul>
              {caps.map((c) => (
                <li key={c.code} className="flex gap-3 border-b border-line px-4 py-2.5 last:border-0">
                  <span className="pt-0.5">
                    <CapabilityMark status={c.status} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-semibold ${c.status === 'UNSUPPORTED' ? 'text-muted' : ''}`}>{c.label}</span>
                    <span className="block text-xs text-muted">{c.reason}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Comandos">
            <div className="grid gap-2 p-4 sm:grid-cols-2">
              {COMMANDS.map((t) => {
                const blocked = commandBlockReason(t, d.mode, d.sdkInt);
                const allowed = can(me.role, commandPermission(t));
                const disabled = !!blocked || !allowed || d.state === 'RETIRED';
                const why = blocked ?? (!allowed ? 'Tu rol no puede ejecutar este comando.' : d.state === 'RETIRED' ? 'El equipo está retirado.' : '');
                return (
                  <button
                    key={t}
                    className={`btn justify-start ${t === 'WIPE_DEVICE' && !disabled ? '!border-denied !text-denied' : ''}`}
                    disabled={disabled}
                    title={why}
                    onClick={() => onCommand(t)}
                  >
                    {COMMAND_LABELS[t]}
                  </button>
                );
              })}
            </div>
            {(() => {
              const blocked = COMMANDS.map((t) => [t, commandBlockReason(t, d.mode, d.sdkInt)] as const).filter(([, b]) => b);
              return blocked.length > 0 ? (
                <div className="border-t border-line px-4 py-3 text-xs text-muted">
                  {blocked.map(([t]) => COMMAND_LABELS[t]).join(', ')}: esta operación requiere un modo de administración compatible o no está
                  permitida por Android.
                </div>
              ) : null;
            })()}
            {devCommands.length > 0 && (
              <div className="overflow-x-auto border-t border-line">
                <table className="grid-table">
                  <thead>
                    <tr>
                      <th>Comando</th>
                      <th>Estado</th>
                      <th>Por</th>
                      <th>Cuándo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devCommands.map((c) => (
                      <tr key={c.id}>
                        <td>{COMMAND_LABELS[c.type]}</td>
                        <td>
                          <CommandStatusPill status={c.status} />
                        </td>
                        <td>{c.requestedBy}</td>
                        <td className="text-muted">{ago(c.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {devEvents.length > 0 && (
            <Panel title="Eventos de este equipo">
              <ul className="divide-y divide-line">
                {devEvents.map((e) => (
                  <li key={e.id} className="px-4 py-2.5 text-sm">
                    <span className="font-semibold">{e.action}</span> {e.target}
                    <span className="block text-xs text-muted">
                      {e.actor} · {ago(e.at)} · {e.result === 'SUCCESS' ? 'correcto' : e.result === 'DENIED' ? 'denegado' : 'error'}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {can(me.role, 'devices.retire') && (
            <Panel title="Administración">
              <div className="flex flex-wrap items-center gap-3 p-4 text-sm">
                {d.state !== 'RETIRED' ? (
                  <>
                    <button className="btn" onClick={() => setRetireOpen(true)}>
                      Retirar administración
                    </button>
                    <span className="text-xs text-muted">Quita las políticas. Para eliminarlo del inventario primero hay que retirarlo.</span>
                  </>
                ) : (
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      const r = deleteDevice(d.id);
                      if (r.ok) {
                        toast(`${d.name} eliminado del inventario.`);
                        nav('/devices');
                      } else toast(r.error, 'error');
                    }}
                  >
                    Eliminar del inventario
                  </button>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>

      <RetireModal open={retireOpen} device={d} onClose={() => setRetireOpen(false)} onConfirm={() => {
        const r = retireDevice(d.id);
        setRetireOpen(false);
        r.ok ? toast(`${d.name} retirado de la administración.`) : toast(r.error, 'error');
      }} />

      <Modal open={!!confirm} onClose={closeConfirm} title={confirm ? `${COMMAND_LABELS[confirm]} ${d.name}` : ''}>
        {confirm && confirm !== 'WIPE_DEVICE' && (
          <>
            <p className="text-sm">{CONFIRM_TEXT[confirm]}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn" onClick={closeConfirm}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => { run(confirm); closeConfirm(); }}>
                {COMMAND_LABELS[confirm]}
              </button>
            </div>
          </>
        )}
        {confirm === 'WIPE_DEVICE' && wipeStep === 1 && (
          <>
            <p className="text-sm">{CONFIRM_TEXT.WIPE_DEVICE}</p>
            <p className="mt-3 rounded-md bg-denied-soft px-3 py-2 text-sm text-denied">
              Confirmación 1 de 2. Asegúrate de que este es el equipo correcto: {d.manufacturer} {d.model}, serie {d.serial ?? 'no disponible'}.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn" onClick={closeConfirm}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => setWipeStep(2)}>Continuar</button>
            </div>
          </>
        )}
        {confirm === 'WIPE_DEVICE' && wipeStep === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); if (typed === d.name) { run('WIPE_DEVICE'); closeConfirm(); } }}>
            <p className="text-sm">
              Confirmación 2 de 2. Escribe <strong>{d.name}</strong> para borrar el equipo.
            </p>
            <input className="input mt-3" value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Nombre del equipo" autoComplete="off" />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn" onClick={closeConfirm}>Cancelar</button>
              <button className="btn btn-danger" disabled={typed !== d.name}>Borrar dispositivo</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function RetireModal({ open, device, onClose, onConfirm }: { open: boolean; device: Device; onClose: () => void; onConfirm: () => void }) {
  const what =
    device.mode === 'WORK_PROFILE'
      ? 'Se eliminará el perfil de trabajo. Los datos personales no se tocan.'
      : device.mode === 'LAB_DEVICE_OWNER'
        ? 'El agente dejará de ser Device Owner. También puedes hacerlo por USB desde la página Laboratorio USB.'
        : 'Se quitan las políticas y el equipo deja de estar administrado.';
  return (
    <Modal open={open} onClose={onClose} title={`Retirar administración de ${device.name}`}>
      <p className="text-sm">{what}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-danger" onClick={onConfirm}>Retirar administración</button>
      </div>
    </Modal>
  );
}
