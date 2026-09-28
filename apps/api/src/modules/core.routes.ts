import type { FastifyInstance } from 'fastify';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  auditLogs,
  clients,
  companies,
  companyMemberships,
  companySettings,
  countries,
  logEvent,
  regulatoryProfiles,
  regulatoryVersions,
  withTenant,
  type Database,
} from '@solarpro/db';
import { CLIENT_TYPES } from '@solarpro/shared';
import { HttpError, requirePermission, tenantOf } from '../auth/guard.js';

/**
 * Rutas base del Módulo 0: identidad, empresas, referencia, clientes (demostrador de
 * aislamiento) y auditoría. Toda consulta pasa por withTenant → RLS en la base de datos.
 */
export function registerCoreRoutes(app: FastifyInstance, db: Database): void {
  /* ─────────── /api/auth ─────────── */

  app.get('/api/auth/me', async (req) => {
    const a = req.auth!;
    const memberships = await withTenant(db, { userId: a.userId, companyId: null }, (tx) =>
      tx
        .select({
          companyId: companyMemberships.companyId,
          role: companyMemberships.roleCode,
          legalName: companies.legalName,
          tradeName: companies.tradeName,
          countryCode: companies.countryCode,
        })
        .from(companyMemberships)
        .innerJoin(companies, eq(companies.id, companyMemberships.companyId))
        .where(and(eq(companyMemberships.userId, a.userId), eq(companyMemberships.status, 'ACTIVO'))),
    );
    return {
      user: { id: a.userId, email: a.email, isSuperAdmin: a.isSuperAdmin },
      activeCompanyId: a.companyId,
      role: a.role,
      permissions: [...a.permissions],
      memberships,
    };
  });

  app.post('/api/auth/login-event', async (req, reply) => {
    await withTenant(db, tenantOf(req), (tx) => logEvent(tx, 'LOGIN', 'users', req.auth!.userId));
    return reply.code(204).send();
  });

  app.post('/api/auth/logout-event', async (req, reply) => {
    await withTenant(db, tenantOf(req), (tx) => logEvent(tx, 'LOGOUT', 'users', req.auth!.userId));
    return reply.code(204).send();
  });

  /* ─────────── /api/companies ─────────── */

  app.get('/api/companies/current', { preHandler: requirePermission('company:settings.read') }, async (req) => {
    return withTenant(db, tenantOf(req), async (tx) => {
      const [company] = await tx.select().from(companies).where(eq(companies.id, req.auth!.companyId!));
      const [settings] = await tx.select().from(companySettings).where(eq(companySettings.companyId, req.auth!.companyId!));
      if (!company) throw new HttpError(404, 'NOT_FOUND', 'Empresa no encontrada.');
      return { company, settings: settings ?? null };
    });
  });

  const createCompany = z.object({
    countryCode: z.enum(['CO', 'VE']),
    legalName: z.string().trim().min(2).max(200),
    tradeName: z.string().trim().max(200).optional(),
    taxId: z.string().trim().min(3).max(40),
    adminUserId: z.string().uuid().optional(),
  });

  app.post('/api/companies', { preHandler: requirePermission('platform:companies.manage') }, async (req, reply) => {
    const body = createCompany.parse(req.body);
    const created = await withTenant(db, { ...tenantOf(req), companyId: null }, async (tx) => {
      const [country] = await tx.select().from(countries).where(eq(countries.code, body.countryCode));
      if (!country) throw new HttpError(400, 'COUNTRY_NOT_CONFIGURED', 'País no configurado.');
      const [c] = await tx
        .insert(companies)
        .values({ countryCode: body.countryCode, legalName: body.legalName, tradeName: body.tradeName, taxId: body.taxId })
        .returning();
      // Entra explícitamente a la empresa recién creada para crear su configuración inicial
      // (las políticas RLS de configuración exigen empresa activa).
      await tx.execute(sql`SELECT set_config('app.company_id', ${c!.id}, true)`);
      await tx.insert(companySettings).values({
        companyId: c!.id,
        // Moneda de cotización y conversión local por defecto del país (VE: USD → Bs a tasa BCV + recargo).
        currencyCode: country.defaultCurrencyCode,
        localCurrencyCode: country.localCurrencyCode,
        fxRateSource: country.fxRateSource,
        fxSurchargePerUnit: country.defaultFxSurcharge,
      });
      if (body.adminUserId) {
        await tx.insert(companyMemberships).values({ companyId: c!.id, userId: body.adminUserId, roleCode: 'ADMIN_EMPRESA' });
      }
      return c!;
    });
    return reply.code(201).send(created);
  });

  /* ─────────── Referencia: países y normativa ─────────── */

  app.get('/api/countries', async (req) =>
    withTenant(db, tenantOf(req), (tx) => tx.select().from(countries).where(eq(countries.active, true))),
  );

  app.get('/api/regulations', { preHandler: requirePermission('regulations:read', { companyRequired: false }) }, async (req) =>
    withTenant(db, tenantOf(req), (tx) =>
      tx
        .select({
          profileId: regulatoryProfiles.id,
          countryCode: regulatoryProfiles.countryCode,
          profile: regulatoryProfiles.name,
          versionId: regulatoryVersions.id,
          version: regulatoryVersions.version,
          versionName: regulatoryVersions.name,
          status: regulatoryVersions.status,
          effectiveDate: regulatoryVersions.effectiveDate,
          source: regulatoryVersions.source,
        })
        .from(regulatoryProfiles)
        .innerJoin(regulatoryVersions, eq(regulatoryVersions.profileId, regulatoryProfiles.id)),
    ),
  );

  /* ─────────── /api/clients (base; se amplía en el Módulo 2) ─────────── */

  const createClient = z.object({
    name: z.string().trim().min(2).max(200),
    clientType: z.enum(CLIENT_TYPES),
    document: z.string().trim().max(40).optional(),
    phone: z.string().trim().max(40).optional(),
    whatsapp: z.string().trim().max(40).optional(),
    email: z.string().email().optional(),
    address: z.string().trim().max(300).optional(),
    city: z.string().trim().max(120).optional(),
    countryCode: z.enum(['CO', 'VE']).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    notes: z.string().max(2000).optional(),
  });

  app.get('/api/clients', { preHandler: requirePermission('clients:read') }, async (req) =>
    withTenant(db, tenantOf(req), (tx) =>
      tx.select().from(clients).where(isNull(clients.deletedAt)).orderBy(desc(clients.createdAt)).limit(200),
    ),
  );

  app.get('/api/clients/:id', { preHandler: requirePermission('clients:read') }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const [row] = await withTenant(db, tenantOf(req), (tx) => tx.select().from(clients).where(eq(clients.id, id)));
    // Mismo 404 para "no existe" y "es de otra empresa": no se revela la existencia.
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Cliente no encontrado.');
    return row;
  });

  app.post('/api/clients', { preHandler: requirePermission('clients:write') }, async (req, reply) => {
    const b = createClient.parse(req.body);
    const [row] = await withTenant(db, tenantOf(req), (tx) =>
      tx
        .insert(clients)
        .values({
          ...b,
          latitude: b.latitude?.toString(),
          longitude: b.longitude?.toString(),
          companyId: req.auth!.companyId!, // SIEMPRE de la sesión, nunca del cuerpo
          createdBy: req.auth!.userId,
        })
        .returning(),
    );
    return reply.code(201).send(row);
  });

  /* ─────────── /api/audit ─────────── */

  app.get('/api/audit', { preHandler: requirePermission('audit:read') }, async (req) => {
    const q = z.object({ limit: z.coerce.number().int().min(1).max(500).default(100) }).parse(req.query);
    return withTenant(db, tenantOf(req), (tx) =>
      tx.select().from(auditLogs).where(eq(auditLogs.companyId, req.auth!.companyId!)).orderBy(desc(auditLogs.id)).limit(q.limit),
    );
  });
}
