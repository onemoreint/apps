import { describe, expect, it } from 'vitest';
import { evaluateCompliance, groupStatus, STATUS_GROUPS } from './index';
import { sampleProject } from '../test/helpers';

describe('motor normativo', () => {
  it('cada regla declara fuente, jurisdicción, versión y estado', () => {
    const rep = evaluateCompliance(sampleProject());
    expect(rep.items.length).toBeGreaterThan(8);
    for (const { rule } of rep.items) {
      expect(rule.sourceDocument).toBeTruthy();
      expect(rule.jurisdiction).toBeTruthy();
      expect(rule.version).toBeTruthy();
      expect(['active', 'superseded', 'draft', 'unverified']).toContain(rule.status);
    }
  });

  it('retiros y ocupación se evalúan con los datos del usuario', () => {
    const rep = evaluateCompliance(sampleProject());
    const get = (id: string) => rep.items.find((i) => i.rule.id === id)!.result.status;
    expect(get('ARQ-RET-01')).toBe('PASS');
    expect(get('ARQ-OCU-01')).toBe('PASS');
    expect(get('ARQ-GEO-01')).toBe('PASS');
  });

  it('ocupación por encima del máximo → FAIL', () => {
    const p = sampleProject();
    const rep = evaluateCompliance({ ...p, site: { ...p.site, maxOccupancy: 40 } });
    expect(rep.items.find((i) => i.rule.id === 'ARQ-OCU-01')!.result.status).toBe('FAIL');
  });

  it('la norma municipal nunca aparece como cumplida sin reglas verificadas', () => {
    const p = sampleProject();
    const sin = evaluateCompliance(p).items.find((i) => i.rule.group === 'municipal')!;
    expect(sin.result.status).toBe('NOT_EVALUATED');
    const con = evaluateCompliance({ ...p, jurisdiction: { ...p.jurisdiction, municipality: 'La Estrella', planningInstrument: 'POT' } }).items.find((i) => i.rule.group === 'municipal')!;
    expect(con.result.status).toBe('UNVERIFIED');
    expect(con.rule.version).toMatch(/NO VERIFICADO/);
  });

  it('las prevalidaciones NSR-10, RETIE y RETILAP no afirman cumplimiento', () => {
    const p = sampleProject((q) => { q.site.floors = 2; });
    const rep = evaluateCompliance(p);
    for (const id of ['CO-NSR10-PRE', 'CO-RETIE-PRE', 'CO-RETILAP-PRE']) {
      expect(rep.items.find((i) => i.rule.id === id)!.result.status).toBe('NOT_EVALUATED');
    }
    const nsr = rep.items.find((i) => i.rule.id === 'CO-NSR10-PRE')!.result;
    expect(nsr.message).toBe('Prevalidación arquitectónica. No constituye diseño ni cálculo estructural.');
    expect(nsr.findings.join(' ')).toMatch(/2 pisos/);
  });

  it('ningún texto afirma aprobación, certificación o cumplimiento legal', () => {
    const text = JSON.stringify(evaluateCompliance(sampleProject())).toLowerCase();
    expect(text).not.toMatch(/\baprobad[oa]\b|certificado por|cumple legalmente|cumple la norma|apto para construcci/);
  });

  it('el centro de estado resume por grupo', () => {
    const rep = evaluateCompliance(sampleProject());
    const st = Object.fromEntries(STATUS_GROUPS.map((g) => [g.label, groupStatus(rep, g.key)]));
    expect(st['Geometría']).toBe('PASS');
    expect(st['Estructura']).toBe('NOT_EVALUATED');
  });
});
