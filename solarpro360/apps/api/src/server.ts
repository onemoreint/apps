import { createDb } from '@solarpro/db';
import { buildApp } from './app.js';
import { createTokenVerifier } from './auth/token.js';
import { loadEnv } from './env.js';

const env = loadEnv();
const { db, close } = createDb(env.DATABASE_URL);

const app = await buildApp({
  db,
  verifyToken: createTokenVerifier({
    jwtSecret: env.SUPABASE_JWT_SECRET || null,
    jwksUrl: env.SUPABASE_JWKS_URL || null,
    issuer: env.SUPABASE_JWT_ISSUER || null,
    audience: env.SUPABASE_JWT_AUDIENCE,
  }),
  corsOrigins: env.API_CORS_ORIGINS.split(',').map((s) => s.trim()),
  rateLimit: { max: env.RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_WINDOW },
  logLevel: env.LOG_LEVEL,
});

const shutdown = async () => {
  await app.close();
  await close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
