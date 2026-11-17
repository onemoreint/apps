// 10. Controles de acceso + recorrido de reserva desde la interfaz.
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { DemoAdapter, memoryStorage } from './data/demoAdapter'
import { DEMO_CREDENTIALS } from './data/auth'

function renderAt(hash: string, adapter = new DemoAdapter(memoryStorage())) {
  window.location.hash = hash
  render(<App adapter={adapter} />)
  return adapter
}

describe('Controles de acceso del panel', () => {
  it('redirige al login cuando no hay sesión', async () => {
    for (const path of ['#/admin', '#/admin/clientas', '#/admin/pagos', '#/admin/configuracion']) {
      renderAt(path)
      expect(await screen.findByRole('heading', { name: 'Panel administrativo' })).toBeInTheDocument()
      expect(screen.queryByText('Clientas registradas')).not.toBeInTheDocument()
      document.body.innerHTML = ''
    }
  })

  it('rechaza credenciales incorrectas y permite el ingreso con las de demo', async () => {
    const user = userEvent.setup()
    renderAt('#/admin/clientas')
    await screen.findByRole('heading', { name: 'Panel administrativo' })
    await user.type(screen.getByLabelText('Correo'), 'intruso@x.com')
    await user.type(screen.getByLabelText('Contraseña'), 'nope')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))
    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Correo'))
    await user.clear(screen.getByLabelText('Contraseña'))
    await user.type(screen.getByLabelText('Correo'), DEMO_CREDENTIALS.email)
    await user.type(screen.getByLabelText('Contraseña'), DEMO_CREDENTIALS.password)
    await user.click(screen.getByRole('button', { name: /ingresar/i }))
    // vuelve a la ruta solicitada
    expect(await screen.findByRole('heading', { name: 'Clientas', level: 1 })).toBeInTheDocument()
  })

  it('el portal público no expone datos de clientas', async () => {
    renderAt('#/')
    expect(await screen.findByRole('heading', { name: /nuestros servicios/i })).toBeInTheDocument()
    expect(screen.queryByText(/Valentina Demo/)).not.toBeInTheDocument()
    expect(screen.getAllByText('Modo demostración').length).toBeGreaterThan(0)
  })
})

describe('Reserva desde el portal (5 pasos)', () => {
  it('completa la reserva y la deja pendiente en la agenda', async () => {
    const user = userEvent.setup()
    const adapter = renderAt('#/reservar')
    await user.click(await screen.findByRole('button', { name: /Manicure/ }))
    // Paso 2: primer día con cupo
    const days = await screen.findAllByRole('button', { name: /, \d+ horarios$/ })
    await user.click(days[0])
    // Paso 3: primer horario
    const slot = (await screen.findAllByRole('button', { name: /(a|p)\. m\.$/ }))[0]
    await user.click(slot)
    // Paso 4: datos — sin autorización no avanza
    await user.type(screen.getByLabelText('Nombre completo'), 'Clienta Interfaz')
    await user.type(screen.getByLabelText(/Celular/), '310 555 1234')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByText(/Necesitamos tu autorización/)).toBeInTheDocument()
    await user.click(screen.getByLabelText(/Autorizo a Angels Spa/))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    // Paso 5: resumen y confirmación
    expect(await screen.findByRole('heading', { name: 'Revisa tu reserva' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /confirmar solicitud/i }))
    expect(await screen.findByRole('heading', { name: '¡Solicitud recibida!' })).toBeInTheDocument()
    const wa = screen.getByRole('link', { name: /enviar por whatsapp/i })
    expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/573017298948\?text=/)

    const data = await adapter.load()
    const c = data.clients.find((x) => x.phone === '573105551234')!
    expect(c).toBeTruthy()
    const appt = data.appointments.find((a) => a.clientId === c.id)!
    expect(appt.status).toBe('pendiente')
  })
})
