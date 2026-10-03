import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { SCENARIO_MODE, useOrgData, useStore } from '../store/store';
import { capabilitiesFor, MODE_DESCRIPTIONS, MODE_LABELS } from '../lib/capabilities';
import { ago, CapabilityMark, PageHeader, Panel, useToast } from '../components/ui';
import type { Enrollment as Enr, EnrollmentScenario } from '../lib/types';

const SCENARIOS: { id: EnrollmentScenario; title: string; who: string; requires: string; method: string }[] = [
  { id: 'CORPORATE', title: 'Equipo de la empresa', who: 'Teléfono entregado para trabajar', requires: 'Restablecido de fábrica', method: 'QR en la pantalla de bienvenida (toca 6 veces) o zero-touch' },
  { id: 'DEDICATED', title: 'Uso dedicado o quiosco', who: 'Terminal de bodega, punto de venta, señalización', requires: 'Restablecido de fábrica', method: 'QR o zero-touch' },
  { id: 'COPE', title: 'Empresa con uso personal', who: 'Equipo corporativo que el empleado también usa', requires: 'Restablecido de fábrica', method: 'QR o zero-touch; crea perfil de trabajo' },
  { id: 'BYOD', title: 'Teléfono personal', who: 'Equipo propio del empleado', requires: 'Nada: los datos personales se conservan', method: 'Enlace de inscripción; instala Android Device Policy' },
  { id: 'LAB', title: 'Laboratorio por USB', who: 'Tu propio teléfono de pruebas', requires: 'Sin cuentas en el teléfono', method: 'adb por USB o QR con el APK del agente' },
];

const AGENT_APK = 'https://github.com/onemoreint/android-control-center/releases/latest/download/acc-agent.apk';

function payloadFor(e: Enr): string {
  if (e.scenario === 'LAB') {
    return JSON.stringify(
      {
        'android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME': 'com.acc.agent/.lab.AccDeviceAdminReceiver',
        'android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION': AGENT_APK,
        'android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM': 'EbA63MXU_t62gR3IhENVXaZVhHxMWbbyovTHF6ddG8A',
        'android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED': true,
        'android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE': { enrollment_token: e.token },
      },
      null,
      2,
    );
  }
  // En producción este QR lo devuelve AMAPI (enterprises.enrollmentTokens.create → qrCode).
  return JSON.stringify({ demo: true, enrollmentToken: e.token, scenario: e.scenario }, null, 2);
}

export function Enrollment() {
  const { policies, enrollments } = useOrgData();
  const createEnrollment = useStore((s) => s.createEnrollment);
  const toast = useToast();
  const [scenario, setScenario] = useState<EnrollmentScenario>('CORPORATE');
  const [policyId, setPolicyId] = useState<string>('');
  const [current, setCurrent] = useState<Enr | null>(null);
  const [qr, setQr] = useState('');

  const mode = SCENARIO_MODE[scenario];
  const caps = capabilitiesFor(mode, 34);
  const meta = SCENARIOS.find((s) => s.id === scenario)!;

  useEffect(() => {
    if (!current) return;
    QRCode.toDataURL(payloadFor(current), { margin: 1, width: 260, color: { dark: '#17302a', light: '#ffffff' } }).then(setQr);
  }, [current]);

  return (
    <>
      <PageHeader title="Inscribir un dispositivo" intro="Elige cómo se usará el equipo. El modo de administración y lo que podrás controlar dependen de esa elección." />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <Panel title="Escenario">
            <div role="radiogroup" className="divide-y divide-line">
              {SCENARIOS.map((s) => (
                <label key={s.id} className={`flex cursor-pointer gap-3 px-4 py-3 ${scenario === s.id ? 'bg-managed-soft/60' : 'hover:bg-paper'}`}>
                  <input type="radio" name="scenario" className="mt-1 accent-[#1f6f5c]" checked={scenario === s.id} onChange={() => { setScenario(s.id); setCurrent(null); }} />
                  <span>
                    <span className="block font-semibold">{s.title}</span>
                    <span className="block text-sm text-muted">{s.who}</span>
                    <span className="mt-1 block text-xs text-muted">Requiere: {s.requires}</span>
                  </span>
                </label>
              ))}
            </div>
          </Panel>

          <Panel title="Generar código">
            <div className="space-y-4 p-4">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Política inicial</span>
                <select className="input" value={policyId} onChange={(e) => setPolicyId(e.target.value)}>
                  <option value="">Sin política</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <p className="text-sm text-muted">Método: {meta.method}. El código caduca en 24 horas.</p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const r = createEnrollment(scenario, policyId || null);
                  if (r.ok && r.enrollment) setCurrent(r.enrollment);
                  else if (!r.ok) toast(r.error, 'error');
                }}
              >
                Generar código de inscripción
              </button>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={`Lo que tendrás: ${MODE_LABELS[mode]}`}>
            <p className="border-b border-line px-4 py-3 text-sm">{MODE_DESCRIPTIONS[mode]}</p>
            <ul className="grid sm:grid-cols-2">
              {caps.map((c) => (
                <li key={c.code} className="flex items-center gap-2 border-b border-line px-4 py-2 text-sm" title={c.reason}>
                  <CapabilityMark status={c.status} size={14} />
                  <span className={c.status === 'UNSUPPORTED' ? 'text-muted' : ''}>{c.label}</span>
                </li>
              ))}
            </ul>
          </Panel>

          {current && (
            <Panel title="Código listo">
              <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr]">
                {qr && <img src={qr} alt={`Código QR de inscripción ${current.token}`} className="h-52 w-52 rounded border border-line" />}
                <div className="min-w-0 text-sm">
                  <div className="text-xs text-muted">Token</div>
                  <div className="text-lg font-bold tracking-wider">{current.token}</div>
                  <div className="mt-2 text-xs text-muted">Caduca {ago(current.expiresAt)}</div>
                  {current.scenario === 'LAB' ? (
                    <p className="mt-3 text-sm">
                      Para tu propio teléfono es más sencillo por cable.{' '}
                      <Link to="/usb-lab" className="font-semibold text-managed hover:underline">Abre la guía del laboratorio USB</Link>.
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-muted">
                      Modo demo: este QR es de ejemplo. Con el backend conectado lo genera la Android Management API.
                    </p>
                  )}
                </div>
              </div>
              <details className="border-t border-line px-4 py-3 text-sm">
                <summary className="cursor-pointer font-semibold">Contenido del QR</summary>
                <pre className="mt-2 overflow-x-auto rounded bg-paper p-3 text-xs">{payloadFor(current)}</pre>
              </details>
            </Panel>
          )}

          {enrollments.length > 0 && (
            <Panel title="Códigos generados">
              <ul className="divide-y divide-line text-sm">
                {enrollments.slice(0, 6).map((e) => (
                  <li key={e.id} className="flex justify-between px-4 py-2">
                    <span><span className="font-semibold">{e.token}</span> · {MODE_LABELS[e.mode]}</span>
                    <span className="text-muted">{e.usedAt ? 'usado' : `caduca ${ago(e.expiresAt)}`}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
