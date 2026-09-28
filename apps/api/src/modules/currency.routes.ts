import type { FastifyInstance } from 'fastify';
import { and, desc, eq, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import { companySettings, currencies, exchangeRates, withTenant, type Database, type Tx } from '@solarpro/db';
import { HttpError, requirePermission, tenantOf } from '../auth/guard.js';

/**
 * Reglas de moneda de la empresa y tasas de cambio.
 * Colombia: COP sin decimales. Venezuela: USD con precio final en Bs = USD × (tasa BCV + recargo).
 */

export interface CurrencyContext {
  currency: string;
  decimals: number;
  local: null | {
    currency: string;
    decimals: number;
    source: string;
    surchargePerUnit: number;
    rate: null | { value: number; date: string; scope: 'EMPRESA' | 'PLATAFORMA' };
  };
}

/** Tasa más reciente: la registrada por la empresa tiene prioridad sobre la de la plataforma en la misma fecha. */
export async function latestRate(tx: Tx, companyId: string, base: string, quote: string, source: string) {
  const rows = await tx
    .select()
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.baseCurrency, base),
        eq(exchangeRates.quoteCurrency, quote),
        eq(exchangeRates.source, source),
        or(eq(exchangeRates.companyId, companyId), isNull(exchangeRates.companyId)),
      ),
    )
    .orderBy(desc(exchangeRates.rateDate), desc(exchangeRates.companyId))
    .limit(1);
  const r = rows[0];
  return r ? { value: Number(r.rate), date: r.rateDate, scope: r.companyId ? ('EMPRESA' as const) : ('PLATAFORMA' as const) } : null;
}

export async function loadCurrencyContext(tx: Tx, companyId: string): Promise<CurrencyContext> {
  const [s] = await tx.select().from(companySettings).where(eq(companySettings.companyId, companyId));
  if (!s) throw new HttpError(409, 'SETTINGS_MISSING', 'La empresa no tiene configuración comercial.');
  const decimalsOf = async (code: string) => {
    const [c] = await tx.select().from(currencies).where(eq(currencies.code, code));
    if (!c) throw new HttpError(409, 'CURRENCY_MISSING', `Moneda ${code} no configurada.`);
    return c.decimals;
  };
  const ctx: CurrencyContext = { currency: s.currencyCode, decimals: await decimalsOf(s.currencyCode), local: null };
  if (s.localCurrencyCode) {
    ctx.local = {
      currency: s.localCurrencyCode,
      decimals: await decimalsOf(s.localCurrencyCode),
      source: s.fxRateSource!,
      surchargePerUnit: Number(s.fxSurchargePerUnit),
      rate: await latestRate(tx, companyId, s.currencyCode, s.localCurrencyCode, s.fxRateSource!),
    };
  }
  return ctx;
}

export function registerCurrencyRoutes(app: FastifyInstance, db: Database): void {
  app.get('/api/currency-settings', { preHandler: requirePermission('company:settings.read') }, async (req) =>
    withTenant(db, tenantOf(req), (tx) => loadCurrencyContext(tx, req.auth!.companyId!)),
  );

  const createRate = z.object({
    baseCurrency: z.string().length(3),
    quoteCurrency: z.string().length(3),
    rate: z.number().positive(),
    source: z.string().trim().min(2).max(40),
    rateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** true = tasa de la plataforma (solo SUPER_ADMIN). */
    global: z.boolean().default(false),
  });

  // Registrar la tasa oficial del día (administradores de empresa, o SUPER_ADMIN para toda la plataforma).
  app.post('/api/exchange-rates', { preHandler: requirePermission('pricing:configure', { companyRequired: false }) }, async (req, reply) => {
    const b = createRate.parse(req.body);
    if (b.global && !req.auth!.isSuperAdmin) throw new HttpError(403, 'FORBIDDEN', 'Solo SUPER_ADMIN publica tasas globales.');
    if (!b.global && !req.auth!.companyId) {
      throw new HttpError(400, 'COMPANY_REQUIRED', 'Indique la empresa activa en la cabecera X-Company-Id.');
    }
    const [row] = await withTenant(db, tenantOf(req), (tx) =>
      tx
        .insert(exchangeRates)
        .values({
          companyId: b.global ? null : req.auth!.companyId!,
          baseCurrency: b.baseCurrency,
          quoteCurrency: b.quoteCurrency,
          rate: b.rate.toString(),
          source: b.source,
          rateDate: b.rateDate,
          createdBy: req.auth!.userId,
        })
        .returning(),
    );
    return reply.code(201).send(row);
  });

  app.get('/api/exchange-rates/latest', { preHandler: requirePermission('budgets:read') }, async (req) => {
    const q = z
      .object({ base: z.string().length(3), quote: z.string().length(3), source: z.string().min(2) })
      .parse(req.query);
    const r = await withTenant(db, tenantOf(req), (tx) => latestRate(tx, req.auth!.companyId!, q.base, q.quote, q.source));
    if (!r) throw new HttpError(404, 'RATE_NOT_FOUND', `No hay tasa ${q.source} registrada para ${q.base}/${q.quote}.`);
    return { ...q, ...r };
  });
}
