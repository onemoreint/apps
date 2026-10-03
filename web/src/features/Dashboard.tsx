import { Link } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useOrgData } from '../store/store';
import { MODE_LABELS } from '../lib/capabilities';
import { ago, Panel, PageHeader, Pill } from '../components/ui';
import type { Device } from '../lib/types';

function countBy<T>(xs: T[], key: (x: T) => string) {
  const m = new Map<string, number>();
  xs.forEach((x) => m.set(key(x), (m.get(key(x)) ?? 0) + 1));
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

type Alert = { device: Device; text: string; tone: 'denied' | 'caution' };

export function Dashboard() {
  const { devices, audit } = useOrgData();
  const active = devices.filter((d) => d.state !== 'RETIRED');
  const online = active.filter((d) => d.state === 'ONLINE').length;
  const offline = active.filter((d) => d.state === 'OFFLINE').length;
  const pending = active.filter((d) => d.state === 'PENDING').length;
  const nonCompliant = active.filter((d) => d.compliance === 'NON_COMPLIANT').length;

  const alerts: Alert[] = [];
  active.forEach((d) => {
    if (d.mode === 'DEVICE_ADMIN') alerts.push({ device: d, text: 'Usa Device Admin, una API retirada. Migrar a perfil de trabajo o inscripción completa.', tone: 'denied' });
    if (d.mode === 'NORMAL_APP') alerts.push({ device: d, text: 'Solo tiene el agente como app normal: no recibe políticas.', tone: 'caution' });
    if (d.state === 'ONLINE' && d.batteryPct < 20) alerts.push({ device: d, text: `Batería al ${d.batteryPct} %.`, tone: 'caution' });
    if (d.state === 'OFFLINE' && Date.now() - new Date(d.lastSeenAt).getTime() > 24 * 3600_000)
      alerts.push({ device: d, text: `Sin conexión desde ${ago(d.lastSeenAt)}.`, tone: 'caution' });
    if (d.compliance === 'NON_COMPLIANT' && d.mode !== 'DEVICE_ADMIN' && d.mode !== 'NORMAL_APP')
      alerts.push({ device: d, text: 'No cumple su política asignada.', tone: 'denied' });
  });

  const stats: [string, number, string][] = [
    ['Inscritos', active.length, `${pending} pendientes de completar`],
    ['En línea', online, `${active.length ? Math.round((online / active.length) * 100) : 0} % de la flota`],
    ['Sin conexión', offline, 'último heartbeat hace más de 15 min'],
    ['No conformes', nonCompliant, 'requieren revisión'],
  ];

  const byVersion = countBy(active, (d) => `Android ${d.androidVersion}`).sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
  const byMaker = countBy(active, (d) => d.manufacturer);
  const byMode = countBy(active, (d) => MODE_LABELS[d.mode]);

  return (
    <>
      <PageHeader title="Resumen de la flota" intro="Estado de los dispositivos inscritos en tu organización." />

      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-panel lg:grid-cols-4">
        {stats.map(([label, value, note], i) => (
          <div key={label} className={`p-5 ${i > 0 ? 'border-line lg:border-l' : ''} ${i % 2 ? 'border-l' : ''} ${i > 1 ? 'border-t lg:border-t-0' : ''}`}>
            <div className="text-sm text-muted">{label}</div>
            <div className="mt-1 text-3xl font-bold">{value}</div>
            <div className="mt-1 text-xs text-muted">{note}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {(
          [
            ['Versión de Android', byVersion],
            ['Fabricante', byMaker],
            ['Modo de administración', byMode],
          ] as const
        ).map(([title, data]) => (
          <Panel key={title} title={title}>
            <div className="h-56 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...data]} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12, fill: '#5b6b66' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f3f5f4' }} formatter={(v) => [v as number, 'Equipos']} />
                  <Bar dataKey="value" fill="#1f6f5c" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title={`Alertas (${alerts.length})`}>
          {alerts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Ningún equipo necesita atención.</p>
          ) : (
            <ul className="divide-y divide-line">
              {alerts.slice(0, 8).map((a, i) => (
                <li key={i} className="flex items-start gap-3 px-4 py-3 text-sm">
                  <Pill tone={a.tone}>{a.device.name}</Pill>
                  <span className="flex-1">
                    {a.text}{' '}
                    <Link to={`/devices/${a.device.id}`} className="font-semibold text-managed hover:underline">
                      Ver equipo
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Actividad reciente" aside={<Link to="/audit" className="text-xs font-semibold text-managed hover:underline">Ver auditoría</Link>}>
          <ol className="relative px-4 py-3">
            {audit.slice(0, 7).map((e) => (
              <li key={e.id} className="relative border-l border-line pb-4 pl-5 last:pb-1">
                <span
                  className={`absolute top-1 -left-[5px] h-2.5 w-2.5 rounded-full ${e.result === 'SUCCESS' ? 'bg-managed' : e.result === 'DENIED' ? 'bg-denied' : 'bg-caution'}`}
                />
                <div className="text-sm">
                  <span className="font-semibold">{e.actor}</span> <span className="text-muted">{e.action}</span> {e.target}
                </div>
                <div className="text-xs text-muted">
                  {ago(e.at)}
                  {e.result !== 'SUCCESS' && <span className="ml-2 font-semibold text-denied">{e.result === 'DENIED' ? 'denegado' : 'error'}</span>}
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}
