import { defineConfig, devices } from "@playwright/test";

// Requiere un backend Supabase local: `npx supabase start` (con Docker) o, sin
// Docker, `node scripts/local-stack.mjs` (ver docs/pruebas-e2e.md).
// PW_CHROMIUM_PATH permite usar un Chromium ya instalado en lugar de descargarlo.
// E2E_NO_SERVER=1 usa una app ya en marcha (por ejemplo, `next start`).
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "es-CO",
    timezoneId: "America/Bogota",
    trace: "retain-on-failure",
    ...(process.env.PW_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } } : {}),
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
    { name: "movil", use: { ...devices["Pixel 7"] } },
  ],
  ...(process.env.E2E_NO_SERVER
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          url: "http://localhost:3000/login",
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }),
});
