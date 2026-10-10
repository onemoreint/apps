// Recorre todos los módulos del menú con cada rol de la óptica de demostración
// y abre fichas de detalle: detecta páginas que fallan al renderizar o que
// muestran a un rol algo fuera de su permiso.
import { expect, test, type Page } from "@playwright/test";

const slug = process.env.DEMO_SLUG ?? "optica-demo";
const password = process.env.DEMO_PASSWORD ?? "";
test.skip(!password, "Requiere DEMO_PASSWORD y la óptica de demostración sembrada.");

const ROLES = [
  { email: "propietario@demo-opticonsulta.test", forbidden: [] as string[] },
  { email: "admin@demo-opticonsulta.test", forbidden: ["ajustes-clinicos"] },
  { email: "optometra@demo-opticonsulta.test", forbidden: ["reportes", "caja", "usuarios"] },
  { email: "asistente@demo-opticonsulta.test", forbidden: ["reportes", "caja", "auditoria"] },
  { email: "caja@demo-opticonsulta.test", forbidden: ["reportes", "productos/nada", "solicitudes", "auditoria"] },
];

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/inicio`));
}

async function expectHealthy(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), path).toBeLessThan(400);
  await expect(page.getByRole("heading", { level: 1 }).first(), path).toBeVisible();
  await expect(page.getByText(/Application error|Unhandled Runtime Error|Internal Server Error/)).toHaveCount(0);
  // Sin desplazamiento horizontal de la página (las tablas se desplazan dentro de su marco).
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `desborde horizontal en ${path}`).toBeLessThanOrEqual(1);
}

for (const role of ROLES) {
  test(`cada módulo del menú abre sin errores · ${role.email}`, async ({ page, isMobile }) => {
    await login(page, role.email);
    if (isMobile) await page.getByText("Menú", { exact: true }).click(); // menú desplegable móvil
    const nav = page.getByRole("navigation", { name: "Módulos" }).first();
    const hrefs = await nav.getByRole("link").evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
    expect(hrefs.length).toBeGreaterThan(3);
    for (const href of hrefs) await expectHealthy(page, href);

    // Fichas de detalle enlazadas desde los listados.
    for (const [list, pattern] of [
      ["pacientes", /\/pacientes\/[0-9a-f-]{36}$/],
      ["ventas", /\/ventas\/[0-9a-f-]{36}$/],
      ["laboratorio", /\/laboratorio\/[0-9a-f-]{36}$/],
      ["cotizaciones", /\/cotizaciones\/[0-9a-f-]{36}$/],
    ] as const) {
      if (!hrefs.includes(`/${slug}/${list}`)) continue;
      await page.goto(`/${slug}/${list}`);
      const links = await page.locator("main a").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
      const detail = links.find((h) => pattern.test(h));
      if (detail) await expectHealthy(page, detail);
    }

    // Lo que no está en su menú responde «sin acceso» o 404, nunca los datos.
    for (const path of role.forbidden) {
      if (path.includes("/nada")) continue;
      await page.goto(`/${slug}/${path}`);
      await expect(page.getByText(/No tienes acceso|no existe|No encontramos/i).first()).toBeVisible();
    }
  });
}
