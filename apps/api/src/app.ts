import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import { InputError } from '@solarpro/calculation-engine';
import type { Database } from '@solarpro/db';
import { authenticate, HttpError } from './auth/guard.js';
import type { TokenVerifier } from './auth/token.js';
import { registerCoreRoutes } from './modules/core.routes.js';
import { registerCalculationRoutes } from './modules/calculations.routes.js';

export interface AppOptions {
  db: Database;
  verifyToken: TokenVerifier;
  corsOrigins?: string[];
  rateLimit?: { max: number; timeWindow: string };
  logLevel?: string;
}

const PUBLIC_ROUTES = new Set(['/api/health']);

export async function buildApp(opts: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: opts.logLevel ?? 'info',
      // Nunca registrar tokens ni cabeceras sensibles.
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    bodyLimit: 1_048_576,
    trustProxy: true,
  });

  app.decorateRequest('auth', null);

  await app.register(helmet);
  await app.register(cors, {
    origin: opts.corsOrigins ?? false,
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Company-Id'],
  });
  await app.register(rateLimit, {
    max: opts.rateLimit?.max ?? 120,
    timeWindow: opts.rateLimit?.timeWindow ?? '1 minute',
  });

  const auth = authenticate(opts.db, opts.verifyToken);
  app.addHook('preHandler', async (req) => {
    if (PUBLIC_ROUTES.has(req.routeOptions.url ?? '')) return;
    await auth(req);
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) {
      return reply.code(err.statusCode).send({ error: err.code, message: err.message });
    }
    if (err instanceof ZodError) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Datos de entrada inválidos.',
        issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    if (err instanceof InputError) {
      return reply.code(422).send({ error: 'CALCULATION_INPUT_ERROR', field: err.field, message: err.message });
    }
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 429) return reply.code(429).send({ error: 'RATE_LIMITED', message: 'Demasiadas solicitudes.' });
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return reply.code(statusCode).send({ error: 'BAD_REQUEST', message: (err as Error).message });
    }
    // Violaciones de RLS u otros errores de BD: se registran y se responde sin filtrar detalles.
    const pgCode = (err as { code?: string }).code;
    if (pgCode === '42501') return reply.code(403).send({ error: 'FORBIDDEN', message: 'No tiene permiso para esta acción.' });
    if (pgCode === '23503' || pgCode === '23514' || pgCode === '23505') {
      return reply.code(409).send({ error: 'CONFLICT', message: 'La operación viola una regla de integridad.' });
    }
    req.log.error({ err }, 'error no controlado');
    return reply.code(500).send({ error: 'INTERNAL_ERROR', message: 'Error interno.' });
  });

  app.get('/api/health', async () => ({ status: 'ok', service: 'solarpro360-api' }));

  registerCoreRoutes(app, opts.db);
  registerCalculationRoutes(app);

  return app;
}
