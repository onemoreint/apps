import { defineConfig, devices } from '@playwright/test'

// Si no se pueden descargar los navegadores de Playwright, se usa Chrome instalado
// (variable PW_CHROME_PATH o canal 'chrome').
const chrome = process.env.PW_CHROME_PATH
const browser = chrome ? { launchOptions: { executablePath: chrome } } : {}

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure', locale: 'es-CO', timezoneId: 'America/Bogota' },
  webServer: { command: 'npm run dev -- --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 60_000 },
  projects: [
    { name: 'movil', use: { ...devices['Pixel 7'], ...browser } },
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 860 }, ...browser } },
  ],
})
