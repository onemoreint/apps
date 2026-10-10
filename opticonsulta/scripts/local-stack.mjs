// Pila local compatible con Supabase SIN Docker, para pruebas de extremo a extremo
// cuando `npx supabase start` no está disponible. Usa los binarios oficiales de
// Supabase Auth (GoTrue) y de PostgREST sobre un PostgreSQL local, y un pequeño
// proxy en :54321 que expone /auth/v1 y /rest/v1 como lo hace Supabase.
//
// NO es para producción. La base E2E se BORRA y se recrea en cada arranque.
//
// Requisitos (variables de entorno):
//   GOTRUE_BIN     ruta al binario `auth` de github.com/supabase/auth/releases
//   POSTGREST_BIN  ruta al binario `postgrest` de github.com/PostgREST/postgrest/releases
//   E2E_DATABASE_URL (opcional) postgres://postgres:postgres@127.0.0.1:5432/opticonsulta_e2e
//
// Uso: node scripts/local-stack.mjs   → escribe .env.e2e con las claves y queda corriendo.
import { spawn } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbUrl = new URL(process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/opticonsulta_e2e");
const dbName = dbUrl.pathname.slice(1);
if (!/_e2e$/.test(dbName)) {
  console.error(`Se rechaza usar "${dbName}": el nombre debe terminar en _e2e.`);
  process.exit(1);
}
for (const v of ["GOTRUE_BIN", "POSTGREST_BIN"]) {
  if (!process.env[v]) {
    console.error(`Falta ${v}. Ver comentario al inicio de este archivo.`);
    process.exit(1);
  }
}

const PORTS = { proxy: 54321, rest: 54330, auth: 54331 };
// LOCAL_JWT_SECRET permite reiniciar la pila conservando las mismas claves.
const jwtSecret = process.env.LOCAL_JWT_SECRET || randomBytes(32).toString("hex");
const authenticatorPassword = randomBytes(12).toString("hex");

function jwt(payload) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const body = `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}`;
  return `${body}.${createHmac("sha256", jwtSecret).update(body).digest("base64url")}`;
}
const exp = 4102444800; // 2100-01-01: claves deterministas para un mismo secreto
const anonKey = jwt({ role: "anon", iss: "opticonsulta-local", exp });
const serviceKey = jwt({ role: "service_role", iss: "opticonsulta-local", exp });

// 1. Base nueva con roles de Supabase.
const admin = new pg.Client({ connectionString: Object.assign(new URL(dbUrl), { pathname: "/postgres" }).toString() });
await admin.connect();
await admin.query(`drop database if exists "${dbName}" with (force)`);
await admin.query(`create database "${dbName}"`);
await admin.end();

const db = new pg.Client({ connectionString: dbUrl.toString() });
await db.connect();
await db.query(`
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator login noinherit; end if;
  end $$;
  alter role authenticator with password '${authenticatorPassword}';
  grant anon, authenticated, service_role to authenticator;
  create schema if not exists auth;
`);

function run(cmd, args, env, name) {
  const child = spawn(cmd, args, { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  const log = (d) => process.stdout.write(`[${name}] ${d}`);
  child.stdout.on("data", log);
  child.stderr.on("data", log);
  return child;
}

const authEnv = {
  API_EXTERNAL_URL: `http://127.0.0.1:${PORTS.proxy}/auth/v1`,
  GOTRUE_API_HOST: "127.0.0.1",
  PORT: String(PORTS.auth),
  GOTRUE_DB_DRIVER: "postgres",
  DATABASE_URL: `${dbUrl.toString()}?search_path=auth`,
  GOTRUE_DB_NAMESPACE: "auth",
  GOTRUE_SITE_URL: process.env.APP_BASE_URL ?? "http://localhost:3000",
  GOTRUE_URI_ALLOW_LIST: "http://localhost:3000/**",
  GOTRUE_JWT_SECRET: jwtSecret,
  GOTRUE_JWT_EXP: "3600",
  GOTRUE_JWT_AUD: "authenticated",
  GOTRUE_JWT_DEFAULT_GROUP_NAME: "authenticated",
  GOTRUE_JWT_ADMIN_ROLES: "service_role",
  GOTRUE_DISABLE_SIGNUP: "false",
  GOTRUE_EXTERNAL_EMAIL_ENABLED: "true",
  // Solo local: sin servidor de correo, las cuentas se confirman solas.
  GOTRUE_MAILER_AUTOCONFIRM: "true",
  GOTRUE_PASSWORD_MIN_LENGTH: "10",
  GOTRUE_LOG_LEVEL: "warn",
};

// 2. Migraciones de Supabase Auth (crean auth.users, auth.uid(), etc.).
await new Promise((resolve, reject) => {
  const m = run(process.env.GOTRUE_BIN, ["migrate"], { ...authEnv, GOTRUE_DB_MIGRATIONS_PATH: path.join(path.dirname(process.env.GOTRUE_BIN), "migrations") }, "auth-migrate");
  m.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`auth migrate salió con ${code}`))));
});

// 3. Privilegios por defecto de Supabase y migraciones de OptiConsulta.
await db.query(`
  grant usage on schema auth to anon, authenticated, service_role;
  create schema if not exists extensions;
  grant usage on schema extensions to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  grant execute on all functions in schema auth to anon, authenticated, service_role;
`);
const dir = path.join(root, "supabase/migrations");
for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  await db.query(readFileSync(path.join(dir, file), "utf8"));
}
await db.query("notify pgrst, 'reload schema'");
await db.end();
console.log("[stack] base E2E lista con migraciones de Auth y de OptiConsulta");

// 4. Servicios.
const restUrl = Object.assign(new URL(dbUrl), { username: "authenticator", password: authenticatorPassword }).toString();
const children = [
  run(process.env.GOTRUE_BIN, ["serve"], authEnv, "auth"),
  run(process.env.POSTGREST_BIN, [], {
    PGRST_DB_URI: restUrl,
    PGRST_DB_SCHEMAS: "public",
    PGRST_DB_ANON_ROLE: "anon",
    PGRST_JWT_SECRET: jwtSecret,
    PGRST_SERVER_PORT: String(PORTS.rest),
    PGRST_SERVER_HOST: "127.0.0.1",
    PGRST_LOG_LEVEL: "warn",
  }, "rest"),
];

// 5. Proxy con las rutas de Supabase.
http
  .createServer((req, res) => {
    const route = req.url?.startsWith("/auth/v1") ? { port: PORTS.auth, prefix: "/auth/v1" } : req.url?.startsWith("/rest/v1") ? { port: PORTS.rest, prefix: "/rest/v1" } : null;
    if (!route) {
      res.writeHead(404).end();
      return;
    }
    const upstream = http.request(
      { host: "127.0.0.1", port: route.port, path: req.url.slice(route.prefix.length) || "/", method: req.method, headers: req.headers },
      (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers);
        up.pipe(res);
      },
    );
    upstream.on("error", () => res.writeHead(502).end());
    req.pipe(upstream);
  })
  .listen(PORTS.proxy, "127.0.0.1");

writeFileSync(
  path.join(root, ".env.e2e"),
  [
    "# Generado por scripts/local-stack.mjs. Claves efímeras SOLO para la pila local.",
    `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:${PORTS.proxy}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
    `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`,
    "APP_BASE_URL=http://localhost:3000",
    `E2E_DATABASE_URL=${dbUrl.toString()}`,
    `LOCAL_JWT_SECRET=${jwtSecret}`,
    "",
  ].join("\n"),
);
console.log(`[stack] listo en http://127.0.0.1:${PORTS.proxy} · claves en .env.e2e`);

const stop = () => {
  for (const c of children) c.kill("SIGTERM");
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
