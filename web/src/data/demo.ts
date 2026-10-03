// Datos ficticios del MODO DEMO. Deterministas (semilla fija) para que
// todas las visitas vean la misma flota.
import type {
  Application,
  AuditEvent,
  Command,
  Compliance,
  Device,
  DeviceState,
  ManagementMode,
  Organization,
  Policy,
  PolicySpec,
  User,
} from '../lib/types';

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const organizations: Organization[] = [
  { id: 'org-andina', name: 'Comercial Andina' },
  { id: 'org-caribe', name: 'Logística Caribe' },
];

export const users: User[] = [
  { id: 'u-super', organizationId: null, name: 'Plataforma', email: 'super@acc.demo', role: 'SUPER_ADMIN' },
  { id: 'u-admin', organizationId: 'org-andina', name: 'Laura Méndez', email: 'admin@andina.demo', role: 'ADMIN' },
  { id: 'u-oper', organizationId: 'org-andina', name: 'Carlos Ruiz', email: 'operador@andina.demo', role: 'OPERATOR' },
  { id: 'u-audit', organizationId: 'org-andina', name: 'Diana Torres', email: 'auditor@andina.demo', role: 'AUDITOR' },
  { id: 'u-viewer', organizationId: 'org-andina', name: 'Andrés Gil', email: 'lector@andina.demo', role: 'VIEWER' },
  { id: 'u-admin2', organizationId: 'org-caribe', name: 'Marta Salas', email: 'admin@caribe.demo', role: 'ADMIN' },
];

const baseSpec: PolicySpec = {
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

export function buildDemo(now = Date.now()) {
  const r = rng(20261003);
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

  const policies: Policy[] = [
    {
      id: 'pol-campo', organizationId: 'org-andina', name: 'Fuerza de ventas',
      description: 'Equipos de vendedores en ruta: apps de la empresa, contraseña obligatoria y Wi-Fi de oficinas.',
      riskLevel: 'MEDIUM', status: 'ACTIVE',
      spec: { ...baseSpec, wifiSsid: 'ANDINA-CORP', passwordMinLength: 6 },
      createdAt: iso(90 * DAY), updatedAt: iso(3 * DAY), updatedBy: 'Laura Méndez',
    },
    {
      id: 'pol-bodega', organizationId: 'org-andina', name: 'Bodega y quiosco',
      description: 'Terminales de inventario en uso único: sin cámara personal, sin USB ni capturas.',
      riskLevel: 'HIGH', status: 'ACTIVE',
      spec: { ...baseSpec, cameraDisabled: true, screenCaptureDisabled: true, usbDataDisabled: true, playStoreMode: 'ALLOWLIST', factoryResetDisabled: true, systemUpdate: 'WINDOWED' },
      createdAt: iso(60 * DAY), updatedAt: iso(9 * DAY), updatedBy: 'Laura Méndez',
    },
    {
      id: 'pol-byod', organizationId: 'org-andina', name: 'Personal (BYOD)',
      description: 'Teléfonos personales con perfil de trabajo. Solo se protege la información de la empresa.',
      riskLevel: 'LOW', status: 'ACTIVE',
      spec: { ...baseSpec, screenCaptureDisabled: true, passwordQuality: 'SOMETHING', passwordMinLength: 4 },
      createdAt: iso(45 * DAY), updatedAt: iso(20 * DAY), updatedBy: 'Carlos Ruiz',
    },
    {
      id: 'pol-lab', organizationId: 'org-andina', name: 'Laboratorio USB',
      description: 'Pruebas con el agente como Device Owner por USB. Sin borrado remoto.',
      riskLevel: 'LOW', status: 'DRAFT',
      spec: { ...baseSpec, passwordQuality: 'NONE', passwordMinLength: 0 },
      createdAt: iso(1 * DAY), updatedAt: iso(2 * HOUR), updatedBy: 'Laura Méndez',
    },
    {
      id: 'pol-caribe', organizationId: 'org-caribe', name: 'Repartidores',
      description: 'Equipos de reparto con rastreo de entregas y bloqueo de apps de juego.',
      riskLevel: 'MEDIUM', status: 'ACTIVE',
      spec: { ...baseSpec, playStoreMode: 'ALLOWLIST' },
      createdAt: iso(30 * DAY), updatedAt: iso(4 * DAY), updatedBy: 'Marta Salas',
    },
  ];

  type Proto = [string, string, string, number, ManagementMode, string | null, string[]];
  const protos: Proto[] = [
    ['Samsung', 'Galaxy A55', '15', 35, 'FULLY_MANAGED', 'pol-campo', ['ventas', 'bogotá']],
    ['Samsung', 'Galaxy A35', '14', 34, 'FULLY_MANAGED', 'pol-campo', ['ventas', 'medellín']],
    ['Samsung', 'Galaxy Tab Active5', '14', 34, 'DEDICATED', 'pol-bodega', ['bodega']],
    ['Samsung', 'Galaxy XCover7', '14', 34, 'DEDICATED', 'pol-bodega', ['bodega']],
    ['Google', 'Pixel 9', '16', 36, 'FULLY_MANAGED', 'pol-campo', ['gerencia']],
    ['Google', 'Pixel 8a', '15', 35, 'WORK_PROFILE', 'pol-byod', ['byod']],
    ['Google', 'Pixel 7', '14', 34, 'WORK_PROFILE', 'pol-byod', ['byod']],
    ['Motorola', 'moto g85', '14', 34, 'FULLY_MANAGED', 'pol-campo', ['ventas', 'cali']],
    ['Motorola', 'moto g54', '14', 34, 'FULLY_MANAGED', 'pol-campo', ['ventas', 'cali']],
    ['Motorola', 'edge 50', '15', 35, 'WORK_PROFILE', 'pol-byod', ['byod']],
    ['Xiaomi', 'Redmi Note 13', '14', 34, 'FULLY_MANAGED', 'pol-campo', ['ventas', 'bogotá']],
    ['Xiaomi', 'Redmi 13C', '13', 33, 'DEDICATED', 'pol-bodega', ['bodega']],
    ['Xiaomi', 'POCO X6', '14', 34, 'WORK_PROFILE', 'pol-byod', ['byod']],
    ['Xiaomi', 'Redmi 12', '13', 33, 'DEVICE_ADMIN', null, ['legado']],
    ['Samsung', 'Galaxy A14', '13', 33, 'NORMAL_APP', null, ['piloto']],
    ['Honor', 'X8d', '15', 35, 'LAB_DEVICE_OWNER', 'pol-lab', ['laboratorio', 'usb']],
  ];
  const protosCaribe: Proto[] = [
    ['Samsung', 'Galaxy A25', '14', 34, 'FULLY_MANAGED', 'pol-caribe', ['reparto']],
    ['Motorola', 'moto e14', '14', 34, 'FULLY_MANAGED', 'pol-caribe', ['reparto']],
    ['Xiaomi', 'Redmi A3', '14', 34, 'FULLY_MANAGED', 'pol-caribe', ['reparto']],
    ['Google', 'Pixel 8', '15', 35, 'WORK_PROFILE', null, ['oficina']],
  ];

  const packagesBase = ['com.android.chrome', 'com.google.android.gm'];
  const devices: Device[] = [];

  const mk = (p: Proto, i: number, orgId: string) => {
    const [manufacturer, model, androidVersion, sdkInt, mode, policyId, tags] = p;
    const roll = r();
    let state: DeviceState = roll < 0.68 ? 'ONLINE' : roll < 0.9 ? 'OFFLINE' : 'PENDING';
    if (mode === 'LAB_DEVICE_OWNER') state = 'PENDING';
    const lastSeenMs =
      state === 'ONLINE' ? Math.floor(r() * 14) * MIN : state === 'OFFLINE' ? (6 + Math.floor(r() * 60)) * HOUR : 2 * DAY;
    let compliance: Compliance = r() < 0.8 ? 'COMPLIANT' : 'NON_COMPLIANT';
    if (state === 'PENDING') compliance = 'UNKNOWN';
    if (mode === 'DEVICE_ADMIN' || mode === 'NORMAL_APP') compliance = 'NON_COMPLIANT';
    const total = [64, 128, 128, 256][Math.floor(r() * 4)];
    const hasSerial = mode === 'FULLY_MANAGED' || mode === 'DEDICATED' || mode === 'LAB_DEVICE_OWNER';
    const prefix = orgId === 'org-andina' ? 'AND' : 'CAR';
    devices.push({
      id: `dev-${prefix.toLowerCase()}-${String(i + 1).padStart(3, '0')}`,
      organizationId: orgId,
      name: `${prefix}-${String(i + 1).padStart(3, '0')}`,
      manufacturer,
      model,
      androidVersion,
      sdkInt,
      serial: hasSerial ? `R${Math.floor(r() * 1e9).toString(36).toUpperCase().padStart(8, 'X')}` : null,
      mode,
      state,
      compliance,
      batteryPct: state === 'PENDING' ? 0 : 8 + Math.floor(r() * 92),
      storageTotalGb: total,
      storageFreeGb: Math.round(total * (0.08 + r() * 0.6)),
      memoryFreeMb: 600 + Math.floor(r() * 3400),
      lastSeenAt: iso(lastSeenMs),
      enrolledAt: iso((5 + Math.floor(r() * 120)) * DAY),
      tags,
      policyId,
      agentVersion: state === 'PENDING' ? '—' : r() < 0.85 ? '0.1.0' : '0.0.9',
      installedPackages:
        policyId === 'pol-bodega'
          ? ['com.andina.inventario', ...packagesBase]
          : policyId === 'pol-caribe'
            ? ['com.caribe.entregas', ...packagesBase]
            : ['com.andina.ventas', 'com.microsoft.teams', ...packagesBase],
    });
  };
  protos.forEach((p, i) => mk(p, i, 'org-andina'));
  protosCaribe.forEach((p, i) => mk(p, i, 'org-caribe'));

  const applications: Application[] = [
    {
      id: 'app-ventas', organizationId: 'org-andina', name: 'Andina Ventas', packageName: 'com.andina.ventas', version: '4.2.1',
      installType: 'FORCE_INSTALLED', permissions: ['CAMERA', 'ACCESS_FINE_LOCATION'],
      managedConfig: [
        { id: 'mc1', key: 'server_url', name: 'Servidor', description: 'URL del API de pedidos', type: 'STRING', value: 'https://pedidos.andina.demo' },
        { id: 'mc2', key: 'offline_mode', name: 'Modo sin conexión', description: 'Permite tomar pedidos sin red', type: 'BOOL', value: true },
        { id: 'mc3', key: 'sync_minutes', name: 'Sincronización', description: 'Minutos entre sincronizaciones', type: 'INTEGER', value: 15 },
      ],
    },
    {
      id: 'app-inv', organizationId: 'org-andina', name: 'Inventario Bodega', packageName: 'com.andina.inventario', version: '2.8.0',
      installType: 'KIOSK', permissions: ['CAMERA'],
      managedConfig: [
        { id: 'mc4', key: 'warehouse_codes', name: 'Bodegas', description: 'Códigos de bodega habilitados', type: 'STRING_ARRAY', value: ['BOG-01', 'MED-02'] },
        { id: 'mc5', key: 'scan_timeout', name: 'Tiempo de escaneo', description: 'Segundos antes de cancelar un escaneo', type: 'FLOAT', value: 2.5 },
      ],
    },
    {
      id: 'app-agent', organizationId: 'org-andina', name: 'Android Control Agent', packageName: 'com.acc.agent', version: '0.1.0',
      installType: 'FORCE_INSTALLED', permissions: ['RECEIVE_BOOT_COMPLETED'],
      managedConfig: [
        { id: 'mc6', key: 'backend_url', name: 'Backend', description: 'URL del backend de Android Control Center', type: 'STRING', value: 'https://acc.andina.demo' },
        { id: 'mc7', key: 'heartbeat_minutes', name: 'Heartbeat', description: 'Minutos entre heartbeats (mínimo 15)', type: 'INTEGER', value: 15 },
      ],
    },
    { id: 'app-teams', organizationId: 'org-andina', name: 'Microsoft Teams', packageName: 'com.microsoft.teams', version: '1416/1.0.0', installType: 'AVAILABLE', permissions: ['RECORD_AUDIO', 'CAMERA'], managedConfig: [] },
    { id: 'app-tiktok', organizationId: 'org-andina', name: 'TikTok', packageName: 'com.zhiliaoapp.musically', version: '—', installType: 'BLOCKED', permissions: [], managedConfig: [] },
    {
      id: 'app-entregas', organizationId: 'org-caribe', name: 'Caribe Entregas', packageName: 'com.caribe.entregas', version: '3.0.4',
      installType: 'FORCE_INSTALLED', permissions: ['ACCESS_FINE_LOCATION', 'CAMERA'], managedConfig: [],
    },
  ];

  const commands: Command[] = [];
  const audit: AuditEvent[] = [];
  const andina = devices.filter((d) => d.organizationId === 'org-andina');
  const cmdTypes = ['SYNC_POLICY', 'LOCK_DEVICE', 'SYNC_NOW', 'REFRESH_CONFIGURATION', 'GET_DEVICE_INFO'] as const;
  for (let i = 0; i < 14; i++) {
    const d = andina[Math.floor(r() * andina.length)];
    const type = cmdTypes[Math.floor(r() * cmdTypes.length)];
    const at = (i * 5 + 1) * HOUR + Math.floor(r() * 50) * MIN;
    const failed = d.state === 'OFFLINE' && r() < 0.6;
    commands.push({
      id: `cmd-${1000 + i}`, organizationId: 'org-andina', deviceId: d.id, type,
      status: failed ? 'EXPIRED' : 'SUCCEEDED',
      requestedBy: r() < 0.5 ? 'Laura Méndez' : 'Carlos Ruiz',
      createdAt: iso(at), completedAt: failed ? null : iso(at - 40_000),
      response: failed ? null : 'OK', error: failed ? 'El dispositivo no se conectó antes de caducar.' : null,
    });
  }

  const actions: [string, string, string, number, AuditEvent['result']][] = [
    ['Laura Méndez', 'auth.login', 'sesión', 12 * MIN, 'SUCCESS'],
    ['Laura Méndez', 'policy.update', 'Laboratorio USB', 2 * HOUR, 'SUCCESS'],
    ['Andrés Gil', 'command.create', 'LOCK_DEVICE', 3 * HOUR, 'DENIED'],
    ['Carlos Ruiz', 'enrollment.create', 'Token BYOD', 5 * HOUR, 'SUCCESS'],
    ['sistema', 'device.offline', 'AND-008', 7 * HOUR, 'SUCCESS'],
    ['Carlos Ruiz', 'command.create', 'SYNC_POLICY', 9 * HOUR, 'SUCCESS'],
    ['desconocido', 'auth.login', 'admin@andina.demo', 11 * HOUR, 'DENIED'],
    ['Laura Méndez', 'app.config.update', 'Andina Ventas · sync_minutes', 26 * HOUR, 'SUCCESS'],
    ['Laura Méndez', 'policy.create', 'Laboratorio USB', 1 * DAY, 'SUCCESS'],
    ['sistema', 'device.enrolled', 'AND-013', 2 * DAY, 'SUCCESS'],
    ['Diana Torres', 'audit.export', 'CSV 30 días', 3 * DAY, 'SUCCESS'],
    ['Laura Méndez', 'user.role.update', 'Carlos Ruiz → Operador', 6 * DAY, 'SUCCESS'],
  ];
  actions.forEach(([actor, action, target, ago, result], i) =>
    audit.push({
      id: `aud-${i + 1}`, organizationId: 'org-andina', at: iso(ago), actor, action, target,
      deviceId: null, ip: actor === 'sistema' ? null : `190.24.${10 + i}.${30 + i * 7}`, result,
    }),
  );
  audit.push({
    id: 'aud-c1', organizationId: 'org-caribe', at: iso(40 * MIN), actor: 'Marta Salas', action: 'auth.login',
    target: 'sesión', deviceId: null, ip: '181.51.2.14', result: 'SUCCESS',
  });

  return { policies, devices, applications, commands, audit, enrollments: [] as import('../lib/types').Enrollment[] };
}
