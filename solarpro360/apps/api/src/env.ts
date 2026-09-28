import { z } from 'zod';

/** Configuración validada al arrancar: si falta algo crítico, la API no inicia. */
const schema = z
  .object({
    DATABASE_URL: z.string().url(),
    SUPABASE_JWT_SECRET: z.string().min(32).optional().or(z.literal('')),
    SUPABASE_JWKS_URL: z.string().url().optional().or(z.literal('')),
    SUPABASE_JWT_ISSUER: z.string().optional().or(z.literal('')),
    SUPABASE_JWT_AUDIENCE: z.string().default('authenticated'),
    API_PORT: z.coerce.number().int().positive().default(4000),
    API_CORS_ORIGINS: z.string().default('http://localhost:3000'),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
    RATE_LIMIT_WINDOW: z.string().default('1 minute'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  })
  .refine((e) => Boolean(e.SUPABASE_JWT_SECRET) || Boolean(e.SUPABASE_JWKS_URL), {
    message: 'Defina SUPABASE_JWT_SECRET o SUPABASE_JWKS_URL para verificar tokens.',
  });

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const r = schema.safeParse(source);
  if (!r.success) {
    const issues = r.error.issues.map((i) => `  - ${i.path.join('.') || 'env'}: ${i.message}`).join('\n');
    throw new Error(`Configuración inválida:\n${issues}`);
  }
  return r.data;
}
