/**
 * Pruebas de API (§48): autenticación, autorización por rol, aislamiento horizontal,
 * validación de entrada, auditoría y endpoints de cálculo. Base de datos PostgreSQL real.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { createDb } from '@solarpro/db';
import { createFixtureCompany, createSuperAdmin, createTestDatabase, type TestDatabase } from '@solarpro/db/testing';
import { buildApp } from '../src/app.js';
import { createTokenVerifier } from '../src/auth/token.js';

const SECRET = 'test-secret-with-at-least-thirty-two-characters!!';
let tdb: TestDatabase;
let app: FastifyInstance;
let closeDb: () => Promise<void>;
let A: Awaited<ReturnType<typeof createFixtureCompany>>;
let B: Awaited<ReturnType<typeof createFixtureCompany>>;
let root: string;

async function token(sub: string, opts: { secret?: string; exp?: string } = {}) {
  return new SignJWT({ email: 'x@test.local' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '5m')
    .sign(new TextEncoder().encode(opts.secret ?? SECRET));
}

async function call(method: 'GET' | 'POST', url: string, user: string | null, company?: string | null, payload?: unknown) {
  const headers: Record<string, string> = {};
  if (user) headers.authorization = `Bearer ${await token(user)}`;
  if (company) headers['x-company-id'] = company;
  return app.inject({ method, url, headers, payload: payload as never });
}

beforeAll(async () => {
  tdb = await createTestDatabase();
  A = await createFixtureCompany(tdb.adminUrl, { country: 'CO', legalName: 'Solar A SAS', taxId: '900000011', roles: ['ADMIN_EMPRESA', 'INGENIERO', 'VENDEDOR', 'CONSULTA'] });
  B = await createFixtureCompany(tdb.adminUrl, { country: 'VE', legalName: 'Solar B CA', taxId: 'J-00000012-0', roles: ['ADMIN_EMPRESA'] });
  root = await createSuperAdmin(tdb.adminUrl);
  const { db, close } = createDb(tdb.appUrl, { max: 4 });
  closeDb = close;
  app = await buildApp({
    db,
    verifyToken: createTokenVerifier({ jwtSecret: SECRET, audience: 'authenticated' }),
    rateLimit: { max: 1000, timeWindow: '1 minute' },
    logLevel: 'silent',
  });
}, 60_000);

afterAll(async () => {
  await app?.close();
  await closeDb?.();
  await tdb?.drop();
});

describe('autenticación', () => {
  it('health es público', async () => {
    expect((await call('GET', '/api/health', null)).statusCode).toBe(200);
  });
  it('sin token → 401', async () => {
    expect((await call('GET', '/api/auth/me', null)).statusCode).toBe(401);
  });
  it('token con firma inválida → 401', async () => {
    const bad = await token(A.users.ADMIN_EMPRESA!, { secret: 'otro-secreto-de-al-menos-treinta-y-dos-caracteres' });
    const r = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { authorization: `Bearer ${bad}` } });
    expect(r.statusCode).toBe(401);
  });
  it('token expirado → 401', async () => {
    const t = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(A.users.ADMIN_EMPRESA!)
      .setAudience('authenticated').setIssuedAt(Math.floor(Date.now() / 1000) - 3600).setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(SECRET));
    const r = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { authorization: `Bearer ${t}` } });
    expect(r.statusCode).toBe(401);
  });
  it('usuario válido en Supabase pero no habilitado en la plataforma → 401', async () => {
    expect((await call('GET', '/api/auth/me', randomUUID())).statusCode).toBe(401);
  });
  it('/me devuelve membresías, rol y permisos', async () => {
    const r = await call('GET', '/api/auth/me', A.users.VENDEDOR!, A.companyId);
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.role).toBe('VENDEDOR');
    expect(body.memberships).toHaveLength(1);
    expect(body.memberships[0].companyId).toBe(A.companyId);
    expect(body.permissions).toContain('proposals:generate');
    expect(body.permissions).not.toContain('technical_rules:write');
  });
});

describe('aislamiento horizontal por empresa', () => {
  let clientA: string;

  it('crear cliente toma company_id de la sesión, no del cuerpo', async () => {
    const r = await call('POST', '/api/clients', A.users.VENDEDOR!, A.companyId, {
      name: 'Cliente A', clientType: 'RESIDENCIAL', companyId: B.companyId,
    });
    expect(r.statusCode).toBe(201);
    expect(r.json().companyId).toBe(A.companyId);
    clientA = r.json().id;
  });

  it('pedir la empresa de otro → 403', async () => {
    expect((await call('GET', '/api/clients', B.users.ADMIN_EMPRESA!, A.companyId)).statusCode).toBe(403);
  });

  it('leer por id un recurso de otra empresa → 404 (no revela existencia)', async () => {
    const r = await call('GET', `/api/clients/${clientA}`, B.users.ADMIN_EMPRESA!, B.companyId);
    expect(r.statusCode).toBe(404);
  });

  it('listados solo muestran la propia empresa', async () => {
    const r = await call('GET', '/api/clients', B.users.ADMIN_EMPRESA!, B.companyId);
    expect(r.json()).toEqual([]);
  });

  it('operaciones de empresa sin X-Company-Id → 400', async () => {
    expect((await call('GET', '/api/clients', A.users.ADMIN_EMPRESA!)).statusCode).toBe(400);
  });

  it('SUPER_ADMIN puede entrar explícitamente a una empresa', async () => {
    const r = await call('GET', '/api/clients', root, A.companyId);
    expect(r.statusCode).toBe(200);
    expect(r.json().map((c: { id: string }) => c.id)).toContain(clientA);
  });
});

describe('autorización por rol', () => {
  it('CONSULTA no puede crear clientes', async () => {
    const r = await call('POST', '/api/clients', A.users.CONSULTA!, A.companyId, { name: 'x y', clientType: 'OTRO' });
    expect(r.statusCode).toBe(403);
  });
  it('solo SUPER_ADMIN crea empresas', async () => {
    const payload = { countryCode: 'VE', legalName: 'Nueva CA', taxId: 'J-99999999-9' };
    expect((await call('POST', '/api/companies', A.users.ADMIN_EMPRESA!, A.companyId, payload)).statusCode).toBe(403);
    const ok = await call('POST', '/api/companies', root, null, payload);
    expect(ok.statusCode).toBe(201);
    expect(ok.json().countryCode).toBe('VE');
  });
  it('solo administradores leen la auditoría', async () => {
    expect((await call('GET', '/api/audit', A.users.VENDEDOR!, A.companyId)).statusCode).toBe(403);
    const r = await call('GET', '/api/audit', A.users.ADMIN_EMPRESA!, A.companyId);
    expect(r.statusCode).toBe(200);
    const entities = r.json().map((l: { entity: string; action: string }) => `${l.action}:${l.entity}`);
    expect(entities).toContain('CREATE:clients');
    expect(r.json().every((l: { companyId: string }) => l.companyId === A.companyId)).toBe(true);
  });
  it('VENDEDOR no puede validar strings (revisión técnica)', async () => {
    expect((await call('POST', '/api/solar/strings', A.users.VENDEDOR!, A.companyId, {})).statusCode).toBe(403);
  });
});

describe('validación de entrada', () => {
  it('rechaza datos inválidos con 400 y detalle', async () => {
    const r = await call('POST', '/api/clients', A.users.VENDEDOR!, A.companyId, { name: 'x', clientType: 'MARCIANO' });
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toBe('VALIDATION_ERROR');
  });
  it('rechaza cabecera de empresa malformada', async () => {
    expect((await call('GET', '/api/clients', A.users.VENDEDOR!, "1' OR '1'='1")).statusCode).toBe(400);
  });
});

describe('auditoría de eventos', () => {
  it('LOGIN queda registrado', async () => {
    expect((await call('POST', '/api/auth/login-event', A.users.INGENIERO!, A.companyId)).statusCode).toBe(204);
    const r = await call('GET', '/api/audit', A.users.ADMIN_EMPRESA!, A.companyId);
    expect(r.json().some((l: { action: string; userId: string }) => l.action === 'LOGIN' && l.userId === A.users.INGENIERO)).toBe(true);
  });
});

describe('endpoints del motor de cálculo', () => {
  const sizing = {
    dailyConsumptionKwh: 10,
    coverage: 1,
    resource: { peakSunHours: 4.5, source: 'fixture de prueba', method: 'DATABASE' },
    panelPowerW: 550,
    performanceRatio: 0.8,
  };

  it('ingeniero dimensiona: resultado con fórmula, variables y supuestos', async () => {
    const r = await call('POST', '/api/solar/size', A.users.INGENIERO!, A.companyId, sizing);
    expect(r.statusCode).toBe(200);
    const b = r.json();
    expect(b.value.panelCount).toBe(6);
    expect(b.formula).toContain('performance_ratio');
    expect(b.assumptions.length).toBeGreaterThan(0);
    expect(b.preliminary).toBe(false);
  });

  it('vendedor obtiene el mismo cálculo marcado como PRELIMINAR', async () => {
    const r = await call('POST', '/api/solar/size', A.users.VENDEDOR!, A.companyId, sizing);
    expect(r.statusCode).toBe(200);
    expect(r.json().value.panelCount).toBe(6);
    expect(r.json().preliminary).toBe(true);
  });

  it('entradas físicamente inválidas → 400 o 422, nunca un resultado inventado', async () => {
    const r = await call('POST', '/api/solar/size', A.users.INGENIERO!, A.companyId, { ...sizing, coverage: 1.5 });
    expect([400, 422]).toContain(r.statusCode);
    const g = await call('POST', '/api/pricing/quote', A.users.VENDEDOR!, A.companyId, {
      totalCost: 100, margin: 1, marginMode: 'GROSS_MARGIN', taxes: [], currency: 'COP', currencyDecimals: 0,
    });
    expect(g.statusCode).toBe(422);
  });

  it('precio separa costo, utilidad, impuestos y precio final', async () => {
    const r = await call('POST', '/api/pricing/quote', A.users.VENDEDOR!, A.companyId, {
      totalCost: 1000000, margin: 0.3, marginMode: 'MARKUP', taxes: [{ code: 'T1', name: 'Tasa fixture', rate: 0.19 }], currency: 'COP', currencyDecimals: 0,
    });
    expect(r.json().value).toMatchObject({ costo_total: 1000000, utilidad: 300000, impuestos: 247000, precio_final: 1547000 });
  });

  it('ROI incluye descargo de responsabilidad', async () => {
    const r = await call('POST', '/api/roi', A.users.CONSULTA!, A.companyId, {
      investment: 10000, firstYearProductionKwh: 5000, selfConsumptionRatio: 1, tariffPerKwh: 0.2,
      tariffEscalation: 0, annualDegradation: 0, annualMaintenance: 0, lifetimeYears: 20,
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().value.disclaimer).toMatch(/No constituye una garantía/);
  });
});

describe('reglas de moneda', () => {
  const quote = { totalCost: 1000, margin: 0.3, marginMode: 'MARKUP', taxes: [] };

  it('Colombia: la moneda y los decimales salen de la empresa (COP, entero), no del cliente', async () => {
    const r = await call('POST', '/api/pricing/quote', A.users.ADMIN_EMPRESA!, A.companyId, {
      ...quote, totalCost: 1000000.4, currency: 'USD', currencyDecimals: 2,
    });
    expect(r.json().value.currency).toBe('COP');
    expect(r.json().value.rounded.precio_final).toBe(1300001);
    expect(r.json().local).toBeUndefined();
  });

  it('Venezuela sin tasa BCV registrada: pide revisión y no inventa el precio en Bs', async () => {
    const r = await call('POST', '/api/pricing/quote', B.users.ADMIN_EMPRESA!, B.companyId, quote);
    expect(r.statusCode).toBe(200);
    expect(r.json().value.currency).toBe('USD');
    expect(r.json().local).toBeNull();
    expect(r.json().status).toBe('REVIEW_REQUIRED');
  });

  it('solo administradores registran la tasa del día', async () => {
    const rate = { baseCurrency: 'USD', quoteCurrency: 'VES', rate: 150, source: 'BCV', rateDate: '2026-09-28' };
    expect((await call('POST', '/api/exchange-rates', A.users.VENDEDOR!, A.companyId, rate)).statusCode).toBe(403);
    expect((await call('POST', '/api/exchange-rates', B.users.ADMIN_EMPRESA!, B.companyId, { ...rate, global: true })).statusCode).toBe(403);
    expect((await call('POST', '/api/exchange-rates', B.users.ADMIN_EMPRESA!, B.companyId, rate)).statusCode).toBe(201);
  });

  it('Venezuela: precio final en Bs = precio USD × (tasa BCV + 200)', async () => {
    const r = await call('POST', '/api/pricing/quote', B.users.ADMIN_EMPRESA!, B.companyId, { ...quote, quoteDate: '2026-09-28' });
    const b = r.json();
    expect(b.value.precio_final).toBe(1300); // USD
    expect(b.local.value.appliedRate).toBe(350); // 150 BCV (fixture) + 200
    expect(b.local.value.localAmount).toBe(455000); // 1300 × 350
    expect(b.local.value.currency).toBe('VES');
    expect(b.local.rateScope).toBe('EMPRESA');
    expect(b.status).toBe('REVIEW_REQUIRED'); // sin impuestos configurados; la conversión en sí está OK
    expect(b.validations.map((v: { code: string }) => v.code)).not.toContain('FX_RATE_NOT_SAME_DAY');
  });

  it('empresa nueva de Venezuela hereda USD → Bs, BCV y recargo 200', async () => {
    const created = await call('POST', '/api/companies', root, null, { countryCode: 'VE', legalName: 'Otra VE CA', taxId: 'J-12121212-1' });
    const r = await call('GET', '/api/currency-settings', root, created.json().id);
    expect(r.json()).toMatchObject({ currency: 'USD', decimals: 2, local: { currency: 'VES', source: 'BCV', surchargePerUnit: 200 } });
  });
});

describe('cotización con desglose', () => {
  const body = {
    context: { panels: 8, strings: 2, inverters: 1, batteries: 0, installedKwp: 4.4, dcCableMeters: 40, acCableMeters: 20 },
    materials: [
      { id: 'p', category: 'PANELES', productName: 'Panel 550 W', unit: 'und', basis: 'PER_PANEL', factor: 1, unitCost: 100 },
      { id: 'i', category: 'INVERSOR', productName: 'Inversor', unit: 'und', basis: 'PER_INVERTER', factor: 1, unitCost: 800 },
    ],
    labor: [{ id: 'l', description: 'Instalación de panel', unit: 'UNIDAD', basis: 'PER_PANEL', factor: 1, unitCost: 10 }],
    transport: { km: 30, costPerKm: 1 },
    engineering: [{ description: 'Diseño', quantity: 1, unit: 'GLOBAL', unitCost: 120 }],
    margin: 0.3, marginMode: 'MARKUP', taxes: [], quoteDate: '2026-09-28',
  };
  it('devuelve cada línea, subtotales por categoría y precio en USD y Bs (VE)', async () => {
    const r = await call('POST', '/api/quotes/preview', B.users.ADMIN_EMPRESA!, B.companyId, body);
    expect(r.statusCode).toBe(200);
    const b = r.json();
    expect(b.value.lines).toHaveLength(5);
    expect(b.value.subtotals).toMatchObject({ MATERIALES: 1600, MANO_DE_OBRA: 80, TRANSPORTE: 30, INGENIERIA: 120 });
    expect(b.value.pricing.costo_total).toBe(1830);
    expect(b.value.pricing.precio_final).toBeCloseTo(2379, 10);
    expect(b.local.value.localAmount).toBeCloseTo(2379 * 350, 6);
  });
});

describe('rate limiting', () => {
  it('limita solicitudes excesivas', async () => {
    const extra = createDb(tdb.appUrl, { max: 1 });
    const limited = await buildApp({
      db: extra.db,
      verifyToken: createTokenVerifier({ jwtSecret: SECRET }),
      rateLimit: { max: 3, timeWindow: '1 minute' },
      logLevel: 'silent',
    });
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) codes.push((await limited.inject({ method: 'GET', url: '/api/health' })).statusCode);
    expect(codes).toEqual([200, 200, 200, 429, 429]);
    await limited.close();
    await extra.close();
  });
});
