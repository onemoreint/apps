// Backend simulado del MODO DEMO. Cada acción pasa por los mismos controles
// que aplicará el backend real: rol (RBAC), organización (multi-tenant),
// capacidades del modo de administración y registro de auditoría.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { buildDemo, organizations, users } from '../data/demo';
import { can, commandPermission, type Permission } from '../lib/rbac';
import { commandBlockReason, NOT_ALLOWED_MESSAGE } from '../lib/capabilities';
import type {
  Application,
  AuditEvent,
  Command,
  CommandType,
  Device,
  Enrollment,
  EnrollmentScenario,
  ManagedConfigEntry,
  ManagementMode,
  Policy,
  User,
} from '../lib/types';

export type Result = { ok: true } | { ok: false; error: string };

const SCENARIO_MODE: Record<EnrollmentScenario, ManagementMode> = {
  CORPORATE: 'FULLY_MANAGED',
  DEDICATED: 'DEDICATED',
  COPE: 'FULLY_MANAGED',
  BYOD: 'WORK_PROFILE',
  LAB: 'LAB_DEVICE_OWNER',
};

interface State {
  sessionUserId: string | null;
  activeOrgId: string;
  devices: Device[];
  policies: Policy[];
  applications: Application[];
  commands: Command[];
  audit: AuditEvent[];
  enrollments: Enrollment[];
  seq: number;

  login: (userId: string) => void;
  logout: () => void;
  switchOrg: (orgId: string) => void;
  resetDemo: () => void;

  issueCommand: (deviceId: string, type: CommandType) => Result;
  setTags: (deviceId: string, tags: string[]) => Result;
  assignPolicy: (deviceId: string, policyId: string | null) => Result;
  retireDevice: (deviceId: string) => Result;
  deleteDevice: (deviceId: string) => Result;

  savePolicy: (p: Policy) => Result;
  deletePolicy: (id: string) => Result;

  saveApp: (a: Application) => Result;
  deleteApp: (id: string) => Result;
  saveConfigEntry: (appId: string, e: ManagedConfigEntry) => Result;
  deleteConfigEntry: (appId: string, entryId: string) => Result;

  createEnrollment: (scenario: EnrollmentScenario, policyId: string | null) => Result & { enrollment?: Enrollment };
}

const fresh = () => buildDemo();

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const me = (): User | undefined => users.find((u) => u.id === get().sessionUserId);
      const nextId = (prefix: string) => {
        const n = get().seq + 1;
        set({ seq: n });
        return `${prefix}-${n}`;
      };
      const log = (action: string, target: string, result: AuditEvent['result'], deviceId: string | null = null, details?: string) => {
        const u = me();
        const ev: AuditEvent = {
          id: nextId('aud'),
          organizationId: get().activeOrgId,
          at: new Date().toISOString(),
          actor: u?.name ?? 'desconocido',
          action,
          target,
          deviceId,
          ip: '127.0.0.1 (demo)',
          result,
          details,
        };
        set({ audit: [ev, ...get().audit] });
      };
      /** RBAC + tenant: devuelve un error o null. */
      const guard = (perm: Permission, action: string, target: string, orgId?: string): string | null => {
        const u = me();
        if (!u) return 'Inicia sesión para continuar.';
        if (!can(u.role, perm)) {
          log(action, target, 'DENIED', null, `Falta el permiso ${perm}`);
          return 'Tu rol no tiene permiso para esta acción.';
        }
        if (orgId && u.role !== 'SUPER_ADMIN' && u.organizationId !== orgId) {
          log(action, target, 'DENIED', null, 'Recurso de otra organización');
          return 'Ese recurso pertenece a otra organización.';
        }
        return null;
      };
      const fail = (error: string): Result => ({ ok: false, error });
      const device = (id: string) => get().devices.find((d) => d.id === id);

      return {
        sessionUserId: null,
        activeOrgId: 'org-andina',
        ...fresh(),
        seq: 1000,

        login: (userId) => {
          const u = users.find((x) => x.id === userId);
          if (!u) return;
          set({ sessionUserId: userId, activeOrgId: u.organizationId ?? organizations[0].id });
          log('auth.login', 'sesión', 'SUCCESS');
        },
        logout: () => {
          log('auth.logout', 'sesión', 'SUCCESS');
          set({ sessionUserId: null });
        },
        switchOrg: (orgId) => {
          const u = me();
          if (u?.role !== 'SUPER_ADMIN') return;
          set({ activeOrgId: orgId });
        },
        resetDemo: () => {
          set({ ...fresh(), seq: 1000 });
          log('demo.reset', 'datos de demostración', 'SUCCESS');
        },

        issueCommand: (deviceId, type) => {
          const d = device(deviceId);
          if (!d) return fail('El dispositivo ya no existe.');
          const err = guard(commandPermission(type), 'command.create', type, d.organizationId);
          if (err) return fail(err);
          const block = commandBlockReason(type, d.mode, d.sdkInt);
          if (block) {
            log('command.create', `${type} · ${d.name}`, 'DENIED', d.id, block);
            return fail(block);
          }
          if (d.state === 'RETIRED') return fail('El dispositivo está retirado.');
          const cmd: Command = {
            id: nextId('cmd'),
            organizationId: d.organizationId,
            deviceId,
            type,
            status: 'QUEUED',
            requestedBy: me()!.name,
            createdAt: new Date().toISOString(),
            completedAt: null,
            response: null,
            error: null,
          };
          set({ commands: [cmd, ...get().commands] });
          log('command.create', `${type} · ${d.name}`, 'SUCCESS', d.id);

          const update = (patch: Partial<Command>) =>
            set({ commands: get().commands.map((c) => (c.id === cmd.id ? { ...c, ...patch } : c)) });
          setTimeout(() => update({ status: 'SENT' }), 700);
          setTimeout(() => {
            const cur = device(deviceId);
            if (!cur || cur.state !== 'ONLINE') {
              update({ status: 'EXPIRED', error: 'El dispositivo no está en línea. El comando se entregará cuando se conecte (simulado: caducado).' });
              log('command.result', `${type} · ${d.name}`, 'ERROR', d.id, 'Caducado');
              return;
            }
            update({ status: 'SUCCEEDED', completedAt: new Date().toISOString(), response: 'OK' });
            if (type === 'WIPE_DEVICE') {
              set({ devices: get().devices.map((x) => (x.id === deviceId ? { ...x, state: 'RETIRED' } : x)) });
            } else {
              set({ devices: get().devices.map((x) => (x.id === deviceId ? { ...x, lastSeenAt: new Date().toISOString() } : x)) });
            }
            log('command.result', `${type} · ${d.name}`, 'SUCCESS', d.id);
          }, 2200);
          return { ok: true };
        },

        setTags: (deviceId, tags) => {
          const d = device(deviceId);
          if (!d) return fail('El dispositivo ya no existe.');
          const err = guard('devices.write', 'device.tags.update', d.name, d.organizationId);
          if (err) return fail(err);
          const clean = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 10);
          set({ devices: get().devices.map((x) => (x.id === deviceId ? { ...x, tags: clean } : x)) });
          log('device.tags.update', d.name, 'SUCCESS', d.id, clean.join(', '));
          return { ok: true };
        },

        assignPolicy: (deviceId, policyId) => {
          const d = device(deviceId);
          if (!d) return fail('El dispositivo ya no existe.');
          const err = guard('policies.assign', 'policy.assign', d.name, d.organizationId);
          if (err) return fail(err);
          if (d.mode === 'NORMAL_APP' || d.mode === 'DEVICE_ADMIN') {
            log('policy.assign', d.name, 'DENIED', d.id, 'Modo sin DPC');
            return fail(NOT_ALLOWED_MESSAGE);
          }
          const p = get().policies.find((x) => x.id === policyId);
          if (policyId && (!p || p.organizationId !== d.organizationId)) return fail('Esa política no pertenece a esta organización.');
          set({ devices: get().devices.map((x) => (x.id === deviceId ? { ...x, policyId } : x)) });
          log('policy.assign', `${p?.name ?? 'sin política'} → ${d.name}`, 'SUCCESS', d.id);
          return { ok: true };
        },

        retireDevice: (deviceId) => {
          const d = device(deviceId);
          if (!d) return fail('El dispositivo ya no existe.');
          const err = guard('devices.retire', 'device.retire', d.name, d.organizationId);
          if (err) return fail(err);
          set({ devices: get().devices.map((x) => (x.id === deviceId ? { ...x, state: 'RETIRED', policyId: null } : x)) });
          log('device.retire', d.name, 'SUCCESS', d.id);
          return { ok: true };
        },

        deleteDevice: (deviceId) => {
          const d = device(deviceId);
          if (!d) return fail('El dispositivo ya no existe.');
          const err = guard('devices.retire', 'device.delete', d.name, d.organizationId);
          if (err) return fail(err);
          if (d.state !== 'RETIRED') return fail('Retira la administración antes de eliminar el equipo del inventario.');
          set({ devices: get().devices.filter((x) => x.id !== deviceId) });
          log('device.delete', d.name, 'SUCCESS', d.id);
          return { ok: true };
        },

        savePolicy: (p) => {
          const err = guard('policies.write', p.id ? 'policy.update' : 'policy.create', p.name, get().activeOrgId);
          if (err) return fail(err);
          if (p.name.trim().length < 3) return fail('El nombre debe tener al menos 3 caracteres.');
          if (p.spec.passwordMinLength < 0 || p.spec.passwordMinLength > 16) return fail('La longitud de contraseña debe estar entre 0 y 16.');
          const now = new Date().toISOString();
          const exists = get().policies.some((x) => x.id === p.id);
          const saved: Policy = {
            ...p,
            id: exists ? p.id : nextId('pol'),
            organizationId: get().activeOrgId,
            createdAt: exists ? p.createdAt : now,
            updatedAt: now,
            updatedBy: me()!.name,
          };
          set({ policies: exists ? get().policies.map((x) => (x.id === p.id ? saved : x)) : [saved, ...get().policies] });
          log(exists ? 'policy.update' : 'policy.create', saved.name, 'SUCCESS');
          return { ok: true };
        },

        deletePolicy: (id) => {
          const p = get().policies.find((x) => x.id === id);
          if (!p) return fail('La política ya no existe.');
          const err = guard('policies.write', 'policy.delete', p.name, p.organizationId);
          if (err) return fail(err);
          const inUse = get().devices.filter((d) => d.policyId === id).length;
          if (inUse) return fail(`La usan ${inUse} dispositivo(s). Asígnales otra política antes de eliminarla.`);
          set({ policies: get().policies.filter((x) => x.id !== id) });
          log('policy.delete', p.name, 'SUCCESS');
          return { ok: true };
        },

        saveApp: (a) => {
          const err = guard('apps.write', 'app.save', a.packageName, get().activeOrgId);
          if (err) return fail(err);
          if (!/^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/.test(a.packageName)) return fail('El package name no es válido (ejemplo: com.empresa.app).');
          const dup = get().applications.find((x) => x.packageName === a.packageName && x.organizationId === get().activeOrgId && x.id !== a.id);
          if (dup) return fail('Esa aplicación ya está en el catálogo.');
          const exists = get().applications.some((x) => x.id === a.id);
          const saved = { ...a, id: exists ? a.id : nextId('app'), organizationId: get().activeOrgId };
          set({ applications: exists ? get().applications.map((x) => (x.id === a.id ? saved : x)) : [saved, ...get().applications] });
          log(exists ? 'app.update' : 'app.create', a.packageName, 'SUCCESS', null, `installType=${a.installType}`);
          return { ok: true };
        },

        deleteApp: (id) => {
          const a = get().applications.find((x) => x.id === id);
          if (!a) return fail('La aplicación ya no existe.');
          const err = guard('apps.write', 'app.delete', a.packageName, a.organizationId);
          if (err) return fail(err);
          set({ applications: get().applications.filter((x) => x.id !== id) });
          log('app.delete', a.packageName, 'SUCCESS');
          return { ok: true };
        },

        saveConfigEntry: (appId, e) => {
          const a = get().applications.find((x) => x.id === appId);
          if (!a) return fail('La aplicación ya no existe.');
          const err = guard('apps.write', 'app.config.update', `${a.name} · ${e.key}`, a.organizationId);
          if (err) return fail(err);
          if (!/^[a-z][a-z0-9_]{1,63}$/.test(e.key)) return fail('La clave debe usar minúsculas, números y guion bajo (ejemplo: server_url).');
          if (a.managedConfig.some((x) => x.key === e.key && x.id !== e.id)) return fail('Ya existe una configuración con esa clave.');
          const exists = a.managedConfig.some((x) => x.id === e.id);
          const entry = { ...e, id: exists ? e.id : nextId('mc') };
          const managedConfig = exists ? a.managedConfig.map((x) => (x.id === e.id ? entry : x)) : [...a.managedConfig, entry];
          set({ applications: get().applications.map((x) => (x.id === appId ? { ...x, managedConfig } : x)) });
          log('app.config.update', `${a.name} · ${e.key}`, 'SUCCESS');
          return { ok: true };
        },

        deleteConfigEntry: (appId, entryId) => {
          const a = get().applications.find((x) => x.id === appId);
          if (!a) return fail('La aplicación ya no existe.');
          const e = a.managedConfig.find((x) => x.id === entryId);
          const err = guard('apps.write', 'app.config.delete', `${a.name} · ${e?.key}`, a.organizationId);
          if (err) return fail(err);
          set({ applications: get().applications.map((x) => (x.id === appId ? { ...x, managedConfig: x.managedConfig.filter((m) => m.id !== entryId) } : x)) });
          log('app.config.delete', `${a.name} · ${e?.key}`, 'SUCCESS');
          return { ok: true };
        },

        createEnrollment: (scenario, policyId) => {
          const err = guard('enrollment.create', 'enrollment.create', scenario, get().activeOrgId);
          if (err) return fail(err);
          const now = Date.now();
          const token = Array.from(crypto.getRandomValues(new Uint8Array(10)))
            .map((b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32])
            .join('');
          const enrollment: Enrollment = {
            id: nextId('enr'),
            organizationId: get().activeOrgId,
            scenario,
            mode: SCENARIO_MODE[scenario],
            policyId,
            token,
            createdAt: new Date(now).toISOString(),
            expiresAt: new Date(now + 24 * 3600_000).toISOString(),
            usedAt: null,
            createdBy: me()!.name,
          };
          set({ enrollments: [enrollment, ...get().enrollments] });
          log('enrollment.create', `${scenario} · ${token.slice(0, 4)}…`, 'SUCCESS');
          return { ok: true, enrollment };
        },
      };
    },
    {
      name: 'acc-demo-v1',
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch {
          return sessionStorage;
        }
      }),
    },
  ),
);

export function useMe(): User | undefined {
  const id = useStore((s) => s.sessionUserId);
  return users.find((u) => u.id === id);
}

/** Selectores con aislamiento por organización. */
export function useOrgData() {
  const org = useStore((s) => s.activeOrgId);
  const devices = useStore((s) => s.devices).filter((d) => d.organizationId === org);
  const policies = useStore((s) => s.policies).filter((p) => p.organizationId === org);
  const applications = useStore((s) => s.applications).filter((a) => a.organizationId === org);
  const commands = useStore((s) => s.commands).filter((c) => c.organizationId === org);
  const audit = useStore((s) => s.audit).filter((a) => a.organizationId === org);
  const enrollments = useStore((s) => s.enrollments).filter((e) => e.organizationId === org);
  return { org, devices, policies, applications, commands, audit, enrollments };
}

export { SCENARIO_MODE };
