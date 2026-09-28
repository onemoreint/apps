import type { Role } from './enums.js';

/**
 * Permisos del sistema (§5). Formato recurso:acción.
 * La matriz rol → permisos vive aquí y se replica en la tabla `role_permissions`
 * mediante el seed, para que la base de datos y la API nunca diverjan.
 */
export const PERMISSIONS = [
  // Plataforma (solo SUPER_ADMIN)
  'platform:companies.manage',
  'platform:countries.manage',
  'platform:regulations.manage',
  'platform:global_catalog.manage',
  'platform:metrics.read',
  // Empresa
  'company:settings.read',
  'company:settings.write',
  'users:read',
  'users:write',
  // Clientes y proyectos
  'clients:read',
  'clients:write',
  'projects:read',
  'projects:write',
  // Técnico
  'diagnostics:read',
  'diagnostics:write',
  'diagnostics:preliminary',
  'sizing:run',
  'scenarios:write',
  'compatibility:review',
  'technical_rules:write',
  'technical_docs:generate',
  // Catálogo y costos
  'catalog:read',
  'catalog:write',
  'labor:write',
  'pricing:configure',
  // Comercial
  'budgets:read',
  'budgets:write',
  'proposals:read',
  'proposals:generate',
  'proposals:approve',
  // Transversal
  'reports:read',
  'regulations:read',
  'audit:read',
  'ai:ask',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const READ_ONLY: Permission[] = [
  'company:settings.read',
  'clients:read',
  'projects:read',
  'diagnostics:read',
  'catalog:read',
  'budgets:read',
  'proposals:read',
  'reports:read',
  'regulations:read',
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  ADMIN_EMPRESA: [
    ...READ_ONLY,
    'company:settings.write',
    'users:read',
    'users:write',
    'clients:write',
    'projects:write',
    'diagnostics:write',
    'diagnostics:preliminary',
    'sizing:run',
    'scenarios:write',
    'compatibility:review',
    'technical_rules:write',
    'technical_docs:generate',
    'catalog:write',
    'labor:write',
    'pricing:configure',
    'budgets:write',
    'proposals:generate',
    'proposals:approve',
    'audit:read',
    'ai:ask',
  ],
  INGENIERO: [
    ...READ_ONLY,
    'projects:write',
    'diagnostics:write',
    'diagnostics:preliminary',
    'sizing:run',
    'scenarios:write',
    'compatibility:review',
    'technical_docs:generate',
    'ai:ask',
  ],
  VENDEDOR: [
    ...READ_ONLY,
    'clients:write',
    'diagnostics:preliminary',
    'scenarios:write',
    'budgets:write',
    'proposals:generate',
    'ai:ask',
  ],
  CONSULTA: READ_ONLY,
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
