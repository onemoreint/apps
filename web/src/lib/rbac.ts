// RBAC: misma matriz que backend/src/main/kotlin/com/acc/auth/Permissions.kt
import type { CommandType, Role } from './types';

export type Permission =
  | 'org.manage'
  | 'users.manage'
  | 'policies.write'
  | 'policies.assign'
  | 'apps.write'
  | 'enrollment.create'
  | 'devices.read'
  | 'devices.write'
  | 'commands.basic'
  | 'commands.reboot'
  | 'commands.wipe'
  | 'devices.retire'
  | 'audit.read';

const ALL: Permission[] = [
  'org.manage',
  'users.manage',
  'policies.write',
  'policies.assign',
  'apps.write',
  'enrollment.create',
  'devices.read',
  'devices.write',
  'commands.basic',
  'commands.reboot',
  'commands.wipe',
  'devices.retire',
  'audit.read',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL.filter((p) => p !== 'org.manage'),
  OPERATOR: ['devices.read', 'devices.write', 'policies.assign', 'enrollment.create', 'commands.basic'],
  AUDITOR: ['devices.read', 'audit.read'],
  VIEWER: ['devices.read'],
};

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Superadministrador',
  ADMIN: 'Administrador',
  OPERATOR: 'Operador',
  AUDITOR: 'Auditor',
  VIEWER: 'Lector',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SUPER_ADMIN: 'Opera la plataforma y todas las organizaciones.',
  ADMIN: 'Controla por completo su organización.',
  OPERATOR: 'Inscribe equipos, asigna políticas, sincroniza y bloquea.',
  AUDITOR: 'Consulta dispositivos y el registro de auditoría.',
  VIEWER: 'Solo consulta dispositivos y el resumen.',
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  'org.manage': 'Gestionar organizaciones',
  'users.manage': 'Gestionar usuarios y roles',
  'policies.write': 'Crear y editar políticas',
  'policies.assign': 'Asignar políticas',
  'apps.write': 'Editar catálogo y configuraciones',
  'enrollment.create': 'Generar códigos de inscripción',
  'devices.read': 'Ver dispositivos',
  'devices.write': 'Editar etiquetas e inventario',
  'commands.basic': 'Sincronizar y bloquear',
  'commands.reboot': 'Reiniciar dispositivos',
  'commands.wipe': 'Borrar dispositivos',
  'devices.retire': 'Retirar administración',
  'audit.read': 'Ver auditoría',
};

export function can(role: Role, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(perm);
}

export function commandPermission(type: CommandType): Permission {
  if (type === 'WIPE_DEVICE') return 'commands.wipe';
  if (type === 'REBOOT_DEVICE') return 'commands.reboot';
  return 'commands.basic';
}
