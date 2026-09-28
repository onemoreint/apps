import { describe, expect, it } from 'vitest';
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES, roleHasPermission } from './index.js';

describe('matriz de permisos', () => {
  it('todo rol tiene permisos válidos', () => {
    for (const role of ROLES) {
      for (const p of ROLE_PERMISSIONS[role]) expect(PERMISSIONS).toContain(p);
    }
  });

  it('solo SUPER_ADMIN administra la plataforma', () => {
    for (const role of ROLES) {
      const has = roleHasPermission(role, 'platform:companies.manage');
      expect(has).toBe(role === 'SUPER_ADMIN');
    }
  });

  it('VENDEDOR no modifica reglas técnicas críticas', () => {
    expect(roleHasPermission('VENDEDOR', 'technical_rules:write')).toBe(false);
    expect(roleHasPermission('VENDEDOR', 'sizing:run')).toBe(false);
    expect(roleHasPermission('VENDEDOR', 'proposals:generate')).toBe(true);
  });

  it('CONSULTA es solo lectura', () => {
    for (const p of ROLE_PERMISSIONS.CONSULTA) expect(p.endsWith('read')).toBe(true);
  });

  it('INGENIERO dimensiona pero no configura precios', () => {
    expect(roleHasPermission('INGENIERO', 'sizing:run')).toBe(true);
    expect(roleHasPermission('INGENIERO', 'pricing:configure')).toBe(false);
  });
});
