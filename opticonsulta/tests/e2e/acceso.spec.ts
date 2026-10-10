// Flujo de acceso de extremo a extremo. Se ejecuta contra el stack local de
// Supabase: `npx supabase start`, `npm run dev` y luego `npx playwright test`.
// Los correos de confirmación se leen en Mailpit (http://127.0.0.1:54324).
import { expect, test } from "@playwright/test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

async function latestLink(request: import("@playwright/test").APIRequestContext, to: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const list = await request.get(`${MAILPIT}/api/v1/search?query=to:${encodeURIComponent(to)}`);
    const body = (await list.json()) as { messages?: { ID: string }[] };
    const id = body.messages?.[0]?.ID;
    if (id) {
      const msg = (await (await request.get(`${MAILPIT}/api/v1/message/${id}`)).json()) as { HTML: string };
      const href = /href="([^"]+)"/.exec(msg.HTML)?.[1];
      if (href) return href.replaceAll("&amp;", "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No llegó correo a ${to}`);
}

test("una ruta privada sin sesión lleva al inicio de sesión y conserva el destino", async ({ page }) => {
  await page.goto("/optica-x/inicio");
  await expect(page).toHaveURL(/\/login\?next=%2Foptica-x%2Finicio/);
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
});

test("el formulario de acceso muestra errores útiles", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Escribe tu correo")).toBeVisible();
  await expect(page.getByText("Escribe tu contraseña")).toBeVisible();
  await page.getByLabel("Correo").fill("nadie@ejemplo.test");
  await page.getByLabel("Contraseña").fill("ClaveIncorrecta1");
  await page.getByRole("button", { name: "Entrar" }).click();
  // (Next.js añade su propio role=alert para anunciar rutas; se busca el texto.)
  await expect(page.getByText("Correo o contraseña incorrectos")).toBeVisible();
});

test("registro, confirmación, configuración inicial y entrada a la óptica", async ({ page, request }) => {
  // La pila sin Docker confirma cuentas automáticamente y no tiene Mailpit.
  test.skip(Boolean(process.env.E2E_AUTOCONFIRM), "Requiere Mailpit (npx supabase start).");
  const stamp = Date.now();
  const email = `prueba-${stamp}@optica.test`;
  const slug = `optica-e2e-${stamp}`;

  await page.goto("/registro");
  await page.getByLabel("Nombre completo").fill("Laura Prueba");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("Lentes2026Ok");
  await page.getByLabel("Repite la contraseña").fill("Lentes2026Ok");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("status")).toContainText("Te enviamos un enlace");

  await page.goto(await latestLink(request, email));
  await expect(page).toHaveURL(/configuracion-inicial/);

  await page.getByLabel("Nombre comercial").fill("Óptica Prueba E2E");
  await page.getByLabel("Dirección web").fill(slug);
  await page.getByRole("button", { name: "Crear óptica" }).click();

  await expect(page).toHaveURL(new RegExp(`/${slug}/inicio`));
  await expect(page.getByRole("heading", { name: "Óptica Prueba E2E" })).toBeVisible();
  await expect(page.getByText("Entraste como propietario")).toBeVisible();
});
