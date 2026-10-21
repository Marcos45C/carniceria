import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'

vi.mock('../features/auth/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'carnicero@demo.local' },
    signOut: vi.fn(),
  }),
}))

describe('DashboardPage', () => {
  it('muestra el nombre de la aplicación, el correo y las acciones principales', () => {
    render(<DashboardPage />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Carnicería Pro' }),
    ).toBeInTheDocument()
    expect(screen.getByText('carnicero@demo.local')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salir' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /actualizar precios/i }),
    ).toBeInTheDocument()
  })

  it('filtra los cortes al buscar por nombre', async () => {
    const user = userEvent.setup()
    render(<DashboardPage />)

    await user.type(screen.getByRole('searchbox', { name: /buscar corte/i }), 'asado')

    expect(screen.getAllByText('Asado de tira').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Vacío')).toHaveLength(0)
  })

  it('permite editar el precio de un corte', async () => {
    const user = userEvent.setup()
    render(<DashboardPage />)

    const [editButton] = screen.getAllByRole('button', {
      name: 'Editar precio de Asado de tira',
    })
    await user.click(editButton)

    const input = screen.getByRole('textbox', { name: 'Nuevo precio de Asado de tira' })
    await user.clear(input)
    await user.type(input, '13000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getAllByText(/13\.000,00/).length).toBeGreaterThan(0)
  })
})