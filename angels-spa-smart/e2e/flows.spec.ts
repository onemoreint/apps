import { expect, test, type Page } from '@playwright/test'

const shot = (page: Page, name: string) => page.screenshot({ path: `e2e/screenshots/${test.info().project.name}-${name}.png`, fullPage: false })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
})

test('portal público y reserva en 5 pasos', async ({ page }) => {
  await page.goto('/#/')
  await expect(page.getByRole('heading', { name: /nuestra obra/ })).toBeVisible()
  await shot(page, '01-portal')
  await page.getByRole('link', { name: /Reservar mi cita/ }).click()
  await page.getByRole('button', { name: /Uñas semipermanentes/ }).click()
  await page.getByRole('button', { name: /, \d+ horarios$/ }).first().click()
  await shot(page, '02-horarios')
  await page.getByRole('button', { name: /(a|p)\. m\.$/ }).first().click()
  await page.getByLabel('Nombre completo').fill('Clienta Ensayo Prueba')
  await page.getByLabel(/Celular/).fill('310 555 7777')
  await page.getByLabel(/Autorizo a Angels Spa/).check()
  await shot(page, '03-datos')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { name: 'Revisa tu reserva' })).toBeVisible()
  await page.getByRole('button', { name: /Confirmar solicitud/ }).click()
  await expect(page.getByRole('heading', { name: '¡Solicitud recibida!' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Enviar por WhatsApp/ })).toHaveAttribute('href', /wa\.me\/573017298948/)
  await shot(page, '04-confirmada')
})

test('rutas administrativas protegidas', async ({ page }) => {
  await page.goto('/#/admin/pagos')
  await expect(page.getByRole('heading', { name: 'Panel administrativo' })).toBeVisible()
  await page.getByLabel('Correo').fill('admin@demo.angelsspa')
  await page.getByLabel('Contraseña').fill('incorrecta')
  await page.getByRole('button', { name: /Ingresar/ }).click()
  await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible()
})

test('panel: dashboard, confirmar cita, registrar pago, agenda y CRM', async ({ page }) => {
  await page.goto('/#/admin/login')
  await page.getByRole('button', { name: 'Autocompletar' }).click()
  await page.getByRole('button', { name: /Ingresar/ }).click()
  await expect(page.getByRole('heading', { name: /Hola, Angels/ })).toBeVisible()
  await shot(page, '05-dashboard')

  // Confirmar una pendiente
  const pend = page.locator('section, div').filter({ has: page.getByRole('heading', { name: 'Pendientes de confirmar' }) }).last()
  await pend.getByRole('button').first().click()
  await expect(page.getByRole('dialog', { name: 'Detalle de la cita' })).toBeVisible()
  await shot(page, '06-detalle-cita')
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
  await expect(page.getByText('Cita confirmada')).toBeVisible()
  await page.getByRole('button', { name: /Registrar pago/ }).click()
  await page.getByLabel('Tipo').selectOption('anticipo')
  await page.getByLabel('Valor (COP)').fill('10000')
  await page.getByRole('button', { name: 'Registrar', exact: true }).click()
  await expect(page.getByText('Pago registrado')).toBeVisible()

  await page.goto('/#/admin/agenda')
  await page.getByRole('tab', { name: 'semana' }).click()
  await shot(page, '07-agenda-semana')
  await page.getByRole('tab', { name: 'mes' }).click()
  await shot(page, '08-agenda-mes')

  await page.goto('/#/admin/clientas')
  await page.getByLabel('Buscar clientas').fill('Valentina')
  await page.getByRole('button', { name: /Valentina Demo/ }).click()
  await expect(page.getByText('Historial de citas')).toBeVisible()
  await shot(page, '09-ficha-clienta')

  await page.goto('/#/admin/pagos')
  await expect(page.getByText('Total registrado')).toBeVisible()
  await shot(page, '10-pagos')
})
