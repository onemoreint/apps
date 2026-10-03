import { describe, expect, it } from 'vitest';
import { can, commandPermission } from '../lib/rbac';
import { parseValue } from '../features/ManagedConfigs';

describe('RBAC', () => {
  it('solo el superadministrador gestiona organizaciones', () => {
    expect(can('SUPER_ADMIN', 'org.manage')).toBe(true);
    expect(can('ADMIN', 'org.manage')).toBe(false);
  });
  it('el operador bloquea pero no reinicia ni borra', () => {
    expect(can('OPERATOR', commandPermission('LOCK_DEVICE'))).toBe(true);
    expect(can('OPERATOR', commandPermission('REBOOT_DEVICE'))).toBe(false);
    expect(can('OPERATOR', commandPermission('WIPE_DEVICE'))).toBe(false);
  });
  it('auditor y lector no ejecutan comandos', () => {
    expect(can('AUDITOR', 'commands.basic')).toBe(false);
    expect(can('VIEWER', 'commands.basic')).toBe(false);
    expect(can('AUDITOR', 'audit.read')).toBe(true);
    expect(can('VIEWER', 'audit.read')).toBe(false);
  });
});

describe('validación de configuraciones administradas', () => {
  it('convierte cada tipo', () => {
    expect(parseValue('INTEGER', '15')).toEqual({ value: 15 });
    expect(parseValue('FLOAT', '2,5')).toEqual({ value: 2.5 });
    expect(parseValue('BOOL', 'false')).toEqual({ value: false });
    expect(parseValue('STRING_ARRAY', 'a\nb, c')).toEqual({ value: ['a', 'b', 'c'] });
  });
  it('rechaza valores que no encajan', () => {
    expect('error' in parseValue('INTEGER', '1.5')).toBe(true);
    expect('error' in parseValue('FLOAT', 'abc')).toBe(true);
  });
});
