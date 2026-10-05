import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppProviders, createQueryClient } from '@/app/providers'
import { routes } from '@/app/router'
import { demoRepository, primaryRepository } from '@/data'
import type { LocalRepository } from '@/data/local/local-repository'

function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AppProviders queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

beforeEach(() => {
  ;(primaryRepository() as LocalRepository).store.clear()
  demoRepository().store.clear()
  localStorage.clear()
})

describe('flujo principal', () => {
  it('sin sesión redirige al login', async () => {
    const router = renderApp('/indicadores')
    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('registro → crear organización → dashboard', async () => {
    const user = userEvent.setup()
    renderApp('/registro')

    await user.type(await screen.findByLabelText('Nombre completo'), 'José Lugo')
    await user.type(screen.getByLabelText('Correo electrónico'), 'jose@empresa.co')
    await user.type(screen.getByLabelText('Contraseña'), 'clave2026')
    await user.type(screen.getByLabelText('Confirma la contraseña'), 'clave2026')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('heading', { name: 'Crea tu organización' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Nombre de la organización'), 'Clínica Norte')
    await user.click(screen.getByRole('button', { name: 'Crear organización' }))

    expect(await screen.findByText(/José/, { selector: 'h1' })).toBeInTheDocument()
    expect(screen.getByText(/Resumen de desempeño · Clínica Norte/)).toBeInTheDocument()
    const nav = screen.getAllByRole('navigation', { name: 'Navegación principal' })[0]!
    expect(within(nav).getByRole('link', { name: 'Usuarios' })).toBeInTheDocument()
  })

  it('muestra errores de validación sin enviar', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    await user.click(await screen.findByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByText('Escribe un correo válido.')).toBeInTheDocument()
    expect(screen.getByText('Escribe tu contraseña.')).toBeInTheDocument()
  })

  it('credenciales incorrectas muestran un mensaje amigable', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    await user.type(await screen.findByLabelText('Correo electrónico'), 'nadie@empresa.co')
    await user.type(screen.getByLabelText('Contraseña'), 'clave2026')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeInTheDocument()
  })

  it('"Ver demostración" entra a la organización DEMO', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    await user.click(await screen.findByRole('button', { name: 'Ver demostración' }))
    expect(await screen.findByText(/Resumen de desempeño · DEMO/)).toBeInTheDocument()
    expect(screen.getAllByText('DEMO').length).toBeGreaterThan(0)
  })

  it('ruta inexistente muestra página no encontrada', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    await user.click(await screen.findByRole('button', { name: 'Ver demostración' }))
    await screen.findByText(/Resumen de desempeño/)
    const router = createMemoryRouter(routes, { initialEntries: ['/no-existe'] })
    render(
      <AppProviders queryClient={createQueryClient()}>
        <RouterProvider router={router} />
      </AppProviders>,
    )
    await waitFor(() => expect(screen.getByText('Página no encontrada')).toBeInTheDocument())
  })
})
