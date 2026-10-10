// Operación comercial, laboratorio, reportes y privacidad de extremo a extremo,
// sobre la óptica de demostración (`node scripts/seed-demo.mjs`).
// Variables: DEMO_PASSWORD (la usada al sembrar) y DEMO_SLUG (por defecto optica-demo).
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const slug = process.env.DEMO_SLUG ?? "optica-demo";
const password = process.env.DEMO_PASSWORD ?? "";
const USERS = {
  propietario: "propietario@demo-opticonsulta.test",
  administrador: "admin@demo-opticonsulta.test",
  asistente: "asistente@demo-opticonsulta.test",
  cajero: "caja@demo-opticonsulta.test",
};

test.describe.configure({ mode: "serial" });
test.skip(!password, "Requiere DEMO_PASSWORD y la óptica de demostración sembrada.");
test.skip(({ isMobile }) => isMobile, "Flujo largo: se valida en escritorio; el diseño móvil se revisa en acceso.spec.ts.");

async function login(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/inicio`));
}

let saleUrl = "";

test("el cajero ve solo indicadores de su rol y no accede a reportes", async ({ page }) => {
  await login(page, USERS.cajero);
  const indicators = page.getByRole("region", { name: "Indicadores" });
  await expect(indicators.getByText("Citas de hoy")).toBeVisible();
  await expect(indicators.getByText("Órdenes de laboratorio")).toBeVisible();
  await expect(indicators.getByText("Venta neta del mes")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Reportes" })).toHaveCount(0);
  await page.goto(`/${slug}/reportes`);
  await expect(page.getByRole("heading", { name: /No tienes acceso/ })).toBeVisible();
});

test("el cajero vende, cobra e imprime el recibo interno", async ({ page }) => {
  await login(page, USERS.cajero);
  await page.goto(`/${slug}/ventas/nueva`);
  await page.getByLabel("Producto 1").selectOption({ label: "Estuche rígido (ACC-EST)" });
  await page.getByLabel("Cant.").fill("2");
  await expect(page.getByText("Existencias en la sede: 19")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar venta" }).click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/ventas/[0-9a-f-]{36}$`));
  saleUrl = new URL(page.url()).pathname;
  await expect(page.getByRole("heading", { name: /Venta V-\d{6}/ })).toBeVisible();

  await page.getByLabel("Valor (COP)").fill("50000");
  await page.getByRole("button", { name: "Registrar pago" }).click();
  await expect(page.getByText("Venta pagada por completo.")).toBeVisible();

  await page.getByRole("link", { name: /Imprimir recibo RC-/ }).click();
  await expect(page.getByRole("heading", { name: /Recibo interno de caja RC-\d{6}/ })).toBeVisible();
  await expect(page.getByText("No es una factura electrónica de venta")).toBeVisible();

  await page.goto(saleUrl);
  await page.getByRole("button", { name: "Solicitar reversión" }).click();
  await page.getByLabel("¿Qué pasó?").fill("El cliente pagó con otro medio");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(page.getByText(/Reversión solicitada/)).toBeVisible();
});

test("el administrador revierte solo con su caja abierta y luego anula la venta", async ({ page }) => {
  await login(page, USERS.administrador);
  await page.goto(saleUrl);
  await page.getByRole("button", { name: "Revertir" }).click();
  await page.getByLabel("Motivo de la reversión").fill("Solicitud del cajero aprobada");
  await page.getByRole("button", { name: "Sí, revertir" }).click();
  await expect(page.getByText(/Para revertir un pago en efectivo abre tu caja/)).toBeVisible();

  await page.goto(`/${slug}/caja`);
  await page.getByLabel("Base en efectivo (COP)").fill("0");
  await page.getByRole("button", { name: "Abrir caja" }).click();
  await expect(page.getByRole("heading", { name: /Tu caja en/ })).toBeVisible();

  await page.goto(saleUrl);
  await page.getByRole("button", { name: "Revertir" }).click();
  await page.getByLabel("Motivo de la reversión").fill("Solicitud del cajero aprobada");
  await page.getByRole("button", { name: "Sí, revertir" }).click();
  await expect(page.getByText(/Revertido: Solicitud del cajero/)).toBeVisible();

  await page.getByRole("button", { name: "Anular venta" }).click();
  await page.getByLabel("Motivo de la anulación").fill("Venta registrada por error");
  await page.getByRole("button", { name: "Sí, anular" }).click();
  await expect(page.getByText(/Venta anulada el/)).toBeVisible();

  await page.goto(`/${slug}/inventario`);
  const row = page.getByRole("row", { name: /Estuche rígido/ });
  await expect(row.getByRole("cell").nth(1)).toHaveText("19"); // 20 iniciales − 1 (demo) − 2 + 2 devueltos
});

test("el administrador aprueba un descuento y convierte la cotización en venta", async ({ page }) => {
  await login(page, USERS.administrador);
  await page.goto(`/${slug}/cotizaciones?pendientes=1`);
  await page.getByRole("link", { name: /C-\d{6}/ }).first().click();
  await expect(page.getByText("Descuento pendiente de aprobación")).toBeVisible();
  await page.getByRole("button", { name: "Aprobar descuento" }).click();
  await expect(page.getByText("Descuento aprobado.")).toBeVisible();
  await page.getByRole("button", { name: "Convertir en venta" }).click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/ventas/[0-9a-f-]{36}$`));
  await expect(page.getByText("Montura metálica ligera")).toBeVisible();
});

test("la asistente hace control de calidad y entrega con historial completo", async ({ page }) => {
  await login(page, USERS.asistente);
  await page.goto(`/${slug}/laboratorio`);
  await page.getByRole("row", { name: /Progresivo digital/ }).getByRole("link").first().click();
  await expect(page.getByRole("heading", { name: "Control de calidad" })).toBeVisible();

  await page.getByRole("button", { name: "Registrar control de calidad" }).click();
  await expect(page.getByText("Para aprobar, marca cada verificación")).toBeVisible();
  for (const box of await page.getByRole("group", { name: "Verificaciones realizadas" }).getByRole("checkbox").all()) await box.check();
  await page.getByRole("button", { name: "Registrar control de calidad" }).click();
  await expect(page.getByRole("heading", { name: "Entrega" })).toBeVisible();

  await page.getByRole("link", { name: /V-\d{6}/ }).click();
  await page.getByLabel("Recibe", { exact: true }).fill("Julián Ejemplo");
  await page.getByRole("button", { name: "Registrar entrega" }).click();
  await expect(page.getByText("Entrega registrada.")).toBeVisible();

  await page.getByRole("link", { name: /OL-\d{6}/ }).click();
  const history = page.getByRole("list").filter({ hasText: "Orden creada" });
  for (const step of ["Orden creada", "Enviada al laboratorio", "Llegó a la óptica", "Entregada a Julián Ejemplo"]) {
    await expect(history).toContainText(step);
  }
});

test("el propietario consulta reportes y exporta con motivo registrado", async ({ page }) => {
  await login(page, USERS.propietario);
  await page.goto(`/${slug}/reportes`);
  await expect(page.getByText("Venta neta")).toBeVisible();
  await expect(page.getByText("Anulaciones")).toBeVisible();
  await page.getByLabel("Qué exportar").selectOption("ventas");
  await page.getByLabel("Motivo").fill("Conciliación mensual con el contador");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar CSV" }).click()]);
  const csv = readFileSync((await download.path())!, "utf8");
  expect(csv.startsWith("﻿Número;Fecha;Estado")).toBe(true);
  expect(csv).toContain("anulada");
  await page.reload();
  await expect(page.getByText(/ventas · \d+ filas · Conciliación mensual con el contador/)).toBeVisible();
});

test("solicitudes de titulares: la asistente registra y el administrador responde", async ({ page }) => {
  await login(page, USERS.asistente);
  await page.goto(`/${slug}/solicitudes`);
  await page.getByLabel("Nombre del titular o de quien lo representa").fill("Otra Titular Ficticia");
  await page.getByLabel("Tipo").selectOption("supresion");
  await page.getByLabel("Qué solicita").fill("Pide eliminar sus datos de contacto de la base.");
  await page.getByRole("button", { name: "Registrar solicitud" }).click();
  await expect(page.getByText("Solicitud registrada")).toBeVisible();
  await expect(page.getByRole("button", { name: "Gestionar" })).toHaveCount(0);

  await login(page, USERS.administrador);
  await page.goto(`/${slug}/solicitudes`);
  const item = page.getByRole("listitem").filter({ hasText: "Otra Titular Ficticia" });
  await item.getByRole("button", { name: "Gestionar" }).click();
  await item.getByLabel("Estado").selectOption("respondida");
  await item.getByRole("button", { name: "Guardar" }).click();
  await expect(item.getByText(/mínimo 10 caracteres/)).toBeVisible();
  await item.getByLabel("Respuesta dada al titular").fill("Se suprimieron los datos de contacto y se informó por correo.");
  await item.getByRole("button", { name: "Guardar" }).click();
  await expect(item.getByText("Respondida")).toBeVisible();
});

test("el cajero cierra su caja con arqueo", async ({ page }) => {
  await login(page, USERS.cajero);
  await page.goto(`/${slug}/caja`);
  for (const field of await page.getByLabel(/^Contado en/).all()) await field.fill("0");
  await page.getByRole("button", { name: "Cerrar caja" }).click();
  await expect(page.getByRole("heading", { name: "Abrir caja" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Cerrada" }).first()).toBeVisible();
});

test("el propietario ajusta un permiso de rol y el cambio aplica de inmediato", async ({ page }) => {
  await login(page, USERS.propietario);
  await page.goto(`/${slug}/roles`);
  await expect(page.getByLabel("Leer historia clínica y notas de consulta para Cajero")).toBeDisabled();
  const toggle = page.getByLabel("Ver reportes financieros y de ventas para Cajero");
  await toggle.check();
  await expect(toggle).toBeChecked();
  await expect(toggle).toBeEnabled(); // la acción terminó

  await login(page, USERS.cajero);
  await page.goto(`/${slug}/reportes`);
  await expect(page.getByRole("heading", { name: "Reportes" })).toBeVisible();

  await login(page, USERS.propietario);
  await page.goto(`/${slug}/roles`);
  await page.getByLabel("Ver reportes financieros y de ventas para Cajero").uncheck();
  await expect(page.getByLabel("Ver reportes financieros y de ventas para Cajero")).toBeEnabled();
  await page.reload();
  await expect(page.getByLabel("Ver reportes financieros y de ventas para Cajero")).not.toBeChecked();
  await login(page, USERS.cajero);
  await page.goto(`/${slug}/reportes`);
  await expect(page.getByRole("heading", { name: /No tienes acceso/ })).toBeVisible();
});
