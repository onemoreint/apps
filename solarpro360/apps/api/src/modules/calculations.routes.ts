import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  checkInverterCompatibility,
  checkStrings,
  computePrice,
  computeRoi,
  convertToLocal,
  buildQuote,
  sizeBatteryBank,
  sizePvSystem,
  worstStatus,
  type CalcResult,
} from '@solarpro/calculation-engine';
import { withTenant, type Database } from '@solarpro/db';
import { HttpError, tenantOf } from '../auth/guard.js';
import { loadCurrencyContext } from './currency.routes.js';
import type { Permission } from '@solarpro/shared';

/**
 * Endpoints de cálculo sin estado: exponen el motor matemático tal cual.
 * La persistencia de resultados llega con los módulos 3–6.
 */

const pos = z.number().positive();
const frac = z.number().gt(0).max(1);

function requireAny(...perms: Permission[]) {
  return async (req: FastifyRequest) => {
    const a = req.auth;
    if (!a) throw new HttpError(401, 'UNAUTHENTICATED', 'Se requiere autenticación.');
    if (!a.companyId) throw new HttpError(400, 'COMPANY_REQUIRED', 'Indique la empresa activa en la cabecera X-Company-Id.');
    if (!perms.some((p) => a.permissions.has(p))) throw new HttpError(403, 'FORBIDDEN', 'No tiene permiso para esta acción.');
  };
}

const envelope = <T>(r: CalcResult<T>, extra: Record<string, unknown> = {}) => ({
  ...r,
  status: worstStatus(r.validations),
  ...extra,
});

export function registerCalculationRoutes(app: FastifyInstance, db: Database): void {
  const sizing = z.object({
    dailyConsumptionKwh: pos,
    coverage: frac,
    resource: z.object({
      peakSunHours: pos.max(12),
      source: z.string().min(1),
      method: z.enum(['MEASURED', 'DATABASE', 'ESTIMATE']),
      updatedAt: z.string().optional(),
    }),
    panelPowerW: pos,
    performanceRatio: frac,
  });

  app.post('/api/solar/size', { preHandler: requireAny('sizing:run', 'diagnostics:preliminary') }, async (req) => {
    const r = sizePvSystem(sizing.parse(req.body));
    // El modo vendedor (sin permiso de dimensionamiento técnico) siempre es preliminar (§36).
    const preliminary = !req.auth!.permissions.has('sizing:run') || r.validations.some((v) => v.code === 'SOLAR_RESOURCE_ESTIMATED');
    return envelope(r, { preliminary });
  });

  const strings = z.object({
    panel: z.object({
      powerW: pos,
      vocV: pos,
      vmpV: pos,
      iscA: pos,
      impA: pos,
      tempCoeffVocPct: z.number().nullish(),
      tempCoeffVmpPct: z.number().nullish(),
      tempCoeffIscPct: z.number().nullish(),
    }),
    inverter: z.object({
      maxDcVoltageV: pos,
      mpptMinV: pos,
      mpptMaxV: pos,
      startVoltageV: pos.nullish(),
      mppts: z
        .array(z.object({ maxInputCurrentA: pos, maxShortCircuitCurrentA: pos.nullish(), maxStrings: z.number().int().positive().nullish() }))
        .min(1)
        .max(24),
    }),
    layout: z.object({
      panelsPerString: z.number().int().min(1).max(100),
      stringsPerMppt: z.array(z.number().int().min(0).max(50)).min(1).max(24),
    }),
    site: z.object({ minAmbientC: z.number().min(-60).max(60).nullish(), maxCellC: z.number().min(-20).max(110).nullish() }).optional(),
  });

  app.post('/api/solar/strings', { preHandler: requireAny('compatibility:review') }, async (req) => {
    const b = strings.parse(req.body);
    return envelope(checkStrings(b.panel, b.inverter, b.layout, b.site));
  });

  const inverterCompat = z.object({
    installedKwp: pos,
    inverter: z.object({ nominalAcPowerW: pos, maxAcPowerW: pos.nullish(), phases: z.union([z.literal(1), z.literal(2), z.literal(3)]), acVoltageV: pos }),
    site: z.object({ phases: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullish(), voltageV: pos.nullish() }).optional(),
    dcAcRule: z.object({ ref: z.string(), min: pos, max: pos }).nullish(),
  });

  app.post('/api/solar/inverter-compatibility', { preHandler: requireAny('compatibility:review') }, async (req) =>
    envelope(checkInverterCompatibility(inverterCompat.parse(req.body))),
  );

  const battery = z.object({
    backedDailyKwh: pos,
    autonomyHours: pos.max(24 * 14),
    battery: z.object({ capacityKwh: pos, nominalVoltageV: pos, depthOfDischarge: frac, roundTripEfficiency: frac, maxPowerW: pos.nullish() }),
    peakLoadW: z.number().min(0).nullish(),
  });

  app.post('/api/batteries/size', { preHandler: requireAny('sizing:run', 'scenarios:write') }, async (req) =>
    envelope(sizeBatteryBank(battery.parse(req.body))),
  );

  const pricing = z.object({
    totalCost: z.number().min(0),
    margin: z.number().min(0),
    marginMode: z.enum(['MARKUP', 'GROSS_MARGIN']),
    taxes: z.array(z.object({ code: z.string(), name: z.string(), rate: z.number().min(0).max(1) })).max(10),
    /** Fecha de la cotización (YYYY-MM-DD); por defecto, hoy. Sirve para advertir si la tasa no es del día. */
    quoteDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  });

  // La moneda, sus decimales y la conversión local salen de la configuración de la empresa,
  // nunca del cliente: COP sin decimales en Colombia; USD → Bs a tasa BCV + recargo en Venezuela.
  app.post('/api/pricing/quote', { preHandler: requireAny('budgets:write') }, async (req) => {
    const b = pricing.parse(req.body);
    const cur = await withTenant(db, tenantOf(req), (tx) => loadCurrencyContext(tx, req.auth!.companyId!));
    const price = computePrice({ ...b, currency: cur.currency, currencyDecimals: cur.decimals });
    const out = envelope(price) as ReturnType<typeof envelope> & { local?: unknown };
    if (cur.local) {
      if (!cur.local.rate) {
        const missing = {
          code: 'FX_RATE_MISSING',
          status: 'REVIEW_REQUIRED' as const,
          message: `No hay tasa ${cur.local.source} registrada para ${cur.currency}/${cur.local.currency}; no se puede calcular el precio final en ${cur.local.currency}.`,
        };
        out.validations = [...out.validations, missing];
        out.status = worstStatus(out.validations);
        out.local = null;
      } else {
        const conv = convertToLocal({
          amount: price.value.precio_final,
          fromCurrency: cur.currency,
          toCurrency: cur.local.currency,
          officialRate: cur.local.rate.value,
          rateSource: cur.local.source,
          rateDate: cur.local.rate.date,
          surchargePerUnit: cur.local.surchargePerUnit,
          toDecimals: cur.local.decimals,
          quoteDate: b.quoteDate ?? new Date().toISOString().slice(0, 10),
        });
        out.local = { ...conv, rateScope: cur.local.rate.scope };
        out.validations = [...out.validations, ...conv.validations];
        out.status = worstStatus(out.validations);
      }
    }
    return out;
  });

  const basis = z.enum(['PER_PANEL', 'PER_STRING', 'PER_INVERTER', 'PER_BATTERY', 'PER_KWP', 'PER_METER_DC', 'PER_METER_AC', 'FIXED']);
  const fixedLine = z.object({ description: z.string().min(1), quantity: z.number().min(0), unit: z.string().min(1), unitCost: z.number().min(0) });
  const quoteBody = z.object({
    context: z.object({
      panels: z.number().int().min(0), strings: z.number().int().min(0), inverters: z.number().int().min(0),
      batteries: z.number().int().min(0), installedKwp: z.number().min(0),
      dcCableMeters: z.number().min(0).nullish(), acCableMeters: z.number().min(0).nullish(),
    }),
    materials: z.array(z.object({
      id: z.string(), category: z.string(), productName: z.string().min(1), unit: z.string().min(1),
      basis, factor: z.number().min(0), unitCost: z.number().min(0), rounding: z.enum(['CEIL', 'NONE']).optional(),
      supplier: z.string().optional(),
    })).max(200),
    labor: z.array(z.object({
      id: z.string(), description: z.string().min(1), unit: z.string().min(1), basis, factor: z.number().min(0),
      unitCost: z.number().min(0), rounding: z.enum(['CEIL', 'NONE']).optional(),
    })).max(100),
    transport: z.object({ km: z.number().min(0), costPerKm: z.number().min(0), trips: z.number().int().min(0).optional() }).nullish(),
    engineering: z.array(fixedLine).max(50).optional(),
    indirectRate: z.number().min(0).max(1).optional(),
    others: z.array(fixedLine).max(50).optional(),
    margin: z.number().min(0),
    marginMode: z.enum(['MARKUP', 'GROSS_MARGIN']),
    taxes: z.array(z.object({ code: z.string(), name: z.string(), rate: z.number().min(0).max(1) })).max(10),
    quoteDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  });

  // Cotización con desglose completo. Moneda y conversión local desde la configuración de la empresa.
  // (En el Módulo 5 los materiales y tarifas saldrán del catálogo y la mano de obra de la empresa.)
  app.post('/api/quotes/preview', { preHandler: requireAny('budgets:write') }, async (req) => {
    const b = quoteBody.parse(req.body);
    const cur = await withTenant(db, tenantOf(req), (tx) => loadCurrencyContext(tx, req.auth!.companyId!));
    const prices = Object.fromEntries(b.materials.map((m) => [m.id, { unitCost: m.unitCost, currency: cur.currency, supplier: m.supplier ?? null }]));
    const q = buildQuote({
      ...b,
      bomRules: b.materials.map((m) => ({ id: m.id, category: m.category, productId: m.id, productName: m.productName, unit: m.unit, basis: m.basis, factor: m.factor, rounding: m.rounding })),
      prices,
      currency: cur.currency,
      currencyDecimals: cur.decimals,
    });
    const out = envelope(q) as ReturnType<typeof envelope> & { local?: unknown };
    if (cur.local) {
      if (!cur.local.rate) {
        out.validations = [...out.validations, { code: 'FX_RATE_MISSING', status: 'REVIEW_REQUIRED' as const,
          message: `No hay tasa ${cur.local.source} registrada; no se puede calcular el precio final en ${cur.local.currency}.` }];
        out.local = null;
      } else {
        const conv = convertToLocal({
          amount: q.value.pricing.precio_final, fromCurrency: cur.currency, toCurrency: cur.local.currency,
          officialRate: cur.local.rate.value, rateSource: cur.local.source, rateDate: cur.local.rate.date,
          surchargePerUnit: cur.local.surchargePerUnit, toDecimals: cur.local.decimals,
          quoteDate: b.quoteDate ?? new Date().toISOString().slice(0, 10),
        });
        out.local = { ...conv, rateScope: cur.local.rate.scope };
        out.validations = [...out.validations, ...conv.validations];
      }
      out.status = worstStatus(out.validations);
    }
    return out;
  });

  const roi = z.object({
    investment: pos,
    firstYearProductionKwh: z.number().min(0),
    selfConsumptionRatio: frac,
    tariffPerKwh: z.number().min(0),
    tariffEscalation: z.number().min(-0.5).max(1),
    annualDegradation: z.number().min(0).lt(1),
    annualMaintenance: z.number().min(0),
    maintenanceEscalation: z.number().min(-0.5).max(1).optional(),
    lifetimeYears: z.number().int().min(1).max(50),
    replacements: z.array(z.object({ year: z.number().int().min(1), cost: z.number().min(0), description: z.string() })).max(20).optional(),
    otherAnnualCosts: z.number().min(0).optional(),
  });

  app.post('/api/roi', { preHandler: requireAny('budgets:read') }, async (req) => envelope(computeRoi(roi.parse(req.body))));
}
