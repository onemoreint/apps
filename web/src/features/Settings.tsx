import { users, organizations } from '../data/demo';
import { useMe, useStore } from '../store/store';
import { CapabilityMark, PageHeader, Panel, Pill } from '../components/ui';
import { PERMISSION_LABELS, ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_PERMISSIONS, type Permission } from '../lib/rbac';
import type { Role } from '../lib/types';

const ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'AUDITOR', 'VIEWER'];

export function Settings() {
  const me = useMe()!;
  const org = useStore((s) => s.activeOrgId);
  const people = users.filter((u) => u.organizationId === org || (me.role === 'SUPER_ADMIN' && u.organizationId === null));
  const perms = Object.keys(PERMISSION_LABELS) as Permission[];

  return (
    <>
      <PageHeader title="Usuarios y roles" intro="Cada persona tiene un rol dentro de una sola organización. Nadie puede ver datos de otra organización salvo el superadministrador de la plataforma." />
      <Panel title={`Personas en ${organizations.find((o) => o.id === org)?.name}`} className="mb-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="grid-table">
            <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Puede</th></tr></thead>
            <tbody>
              {people.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold whitespace-nowrap">{u.name}{u.id === me.id && <span className="ml-2 text-xs font-normal text-muted">(tú)</span>}</td>
                  <td className="text-muted">{u.email}</td>
                  <td><Pill tone={u.role === 'SUPER_ADMIN' || u.role === 'ADMIN' ? 'spruce' : 'neutral'}>{ROLE_LABELS[u.role]}</Pill></td>
                  <td className="text-sm text-muted">{ROLE_DESCRIPTIONS[u.role]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-3 text-xs text-muted">
          En el modo demo las personas son fijas. Con el backend, los administradores invitan usuarios y cambian roles; cada cambio queda en auditoría.
        </p>
      </Panel>

      <Panel title="Permisos por rol" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="grid-table">
            <thead>
              <tr><th>Permiso</th>{ROLES.map((r) => <th key={r} className="text-center">{ROLE_LABELS[r]}</th>)}</tr>
            </thead>
            <tbody>
              {perms.map((p) => (
                <tr key={p}>
                  <td className="whitespace-nowrap">{PERMISSION_LABELS[p]}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="text-center">
                      <span className="inline-flex">
                        <CapabilityMark status={ROLE_PERMISSIONS[r].includes(p) ? 'SUPPORTED' : 'UNSUPPORTED'} size={15} />
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
