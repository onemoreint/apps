import { expect, it } from 'vitest';
import { buildDemoContacts, buildDemoOrganization } from '../src/data/seed';
import { computeDuplication } from '../src/domain/engine/duplication';

it('los datos demo muestran una organización con dependencia del líder (para ilustrar el índice)', () => {
  const now = new Date(2026, 8, 27, 10);
  const { contacts, interactions } = buildDemoContacts(now);
  const { members, logs } = buildDemoOrganization(now, 'José Lugo');
  const d = computeDuplication(members, logs, contacts, interactions, now);
  expect(d.index).toBeGreaterThanOrEqual(30);
  expect(d.index).toBeLessThan(55);
});
