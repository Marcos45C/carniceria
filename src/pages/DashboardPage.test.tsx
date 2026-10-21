import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIXTURE_CUTS } from '../test/fixtures'
import { DashboardPage } from './DashboardPage'

vi.mock('../features/auth/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'carnicero@demo.local' },
    signOut: vi.fn(),
  }),
}))

const cutsMocks = vi.hoisted(() => ({
  fetchCuts: vi.fn(),
  createCut: vi.fn(),
  updateCutDetails: vi.fn(),
  setCutPrice: vi.fn(),
}))

vi.mock('../features/cuts/cutsService', () => cutsMocks)

beforeEach(() => {
  vi.resetAllMocks()
  cutsMocks.fetchCuts.mockResolvedValue({ ok: true, data: FIXTURE_CUTS })
})

describe('DashboardPage', () => {
  it('muestra "cargando" y luego los cortes del servidor', async () => {
    render(<DashboardPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando cortes')
    expect((await screen.findAllByText('Asado de tira')).length).toBeGreaterThan(0)
    expect(screen.getByText('carnicero@demo.local')).toBeInTheDocument()
    expect(cutsMocks.fetchCuts).toHaveBeenCalledTimes(1)
  })

  it('muestra el error de carga y permite reintentar', async () => {
    const user = userEvent.setup()
    cutsMocks.fetchCuts
      .mockResolvedValueOnce({ ok: false, message: 'No se pudo conectar con el servidor.' })
      .mockResolvedValueOnce({ ok: true, data: FIXTURE_CUTS })
    render(<DashboardPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor.')

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect((await screen.findAllByText('Asado de tira')).length).toBeGreaterThan(0)
  })

  it('filtra los cortes al buscar por nombre', async () => {
    const user = userEvent.setup()
    render(<DashboardPage />)
    await screen.findAllByText('Asado de tira')

    await user.type(screen.getByRole('searchbox', { name: /buscar corte/i }), 'asado')

    expect(screen.getAllByText('Asado de tira').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Vacío')).toHaveLength(0)
  })

  it('guarda el nuevo precio cuando el servidor confirma', async () => {
    const user = userEvent.setup()
    cutsMocks.setCutPrice.mockResolvedValue({
      ok: true,
      data: { ...FIXTURE_CUTS[0], price: 13000, priceUpdatedAt: '2026-10-21T15:00:00Z' },
    })
    render(<DashboardPage />)
    await screen.findAllByText('Asado de tira')

    const [editButton] = screen.getAllByRole('button', { name: 'Editar precio de Asado de tira' })
    await user.click(editButton)
    const input = screen.getByRole('textbox', { name: 'Nuevo precio de Asado de tira' })
    await user.clear(input)
    await user.type(input, '13000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('status')).toHaveTextContent(/13\.000,00/)
    expect(cutsMocks.setCutPrice).toHaveBeenCalledWith('demo-01', 13000, 12500)
  })

  it('muestra el error del servidor y conserva la edición si el precio cambió', async () => {
    const user = userEvent.setup()
    cutsMocks.setCutPrice.mockResolvedValue({
      ok: false,
      code: 'PT409',
      message: 'El precio de este corte cambió mientras lo editabas.',
    })
    render(<DashboardPage />)
    await screen.findAllByText('Asado de tira')

    const [editButton] = screen.getAllByRole('button', { name: 'Editar precio de Asado de tira' })
    await user.click(editButton)
    const input = screen.getByRole('textbox', { name: 'Nuevo precio de Asado de tira' })
    await user.clear(input)
    await user.type(input, '13000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/cambió/)
    expect(screen.getByRole('textbox', { name: 'Nuevo precio de Asado de tira' })).toBeInTheDocument()
  })

  it('crea un corte nuevo', async () => {
    const user = userEvent.setup()
    cutsMocks.createCut.mockResolvedValue({
      ok: true,
      data: {
        id: 'new-1',
        name: 'Molida especial',
        category: null,
        unit: 'kg',
        price: 8500,
        priceUpdatedAt: '2026-10-21T15:00:00Z',
        isActive: true,
      },
    })
    render(<DashboardPage />)
    await screen.findAllByText('Asado de tira')

    await user.click(screen.getByRole('button', { name: 'Agregar corte' }))
    await user.type(screen.getByLabelText('Nombre'), 'Molida especial')
    await user.type(screen.getByLabelText('Precio inicial'), '8500')
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Agregar corte' }),
    )

    expect((await screen.findAllByText('Molida especial')).length).toBeGreaterThan(0)
    expect(cutsMocks.createCut).toHaveBeenCalledWith({
      name: 'Molida especial',
      category: null,
      unit: 'kg',
      price: 8500,
      isActive: true,
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('muestra el error del servidor si el nombre del corte ya existe', async () => {
    const user = userEvent.setup()
    cutsMocks.createCut.mockResolvedValue({
      ok: false,
      code: '23505',
      message: 'Ya existe un corte con ese nombre.',
    })
    render(<DashboardPage />)
    await screen.findAllByText('Asado de tira')

    await user.click(screen.getByRole('button', { name: 'Agregar corte' }))
    await user.type(screen.getByLabelText('Nombre'), 'Molida nueva')
    await user.type(screen.getByLabelText('Precio inicial'), '8500')
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Agregar corte' }),
    )

    expect(await screen.findByText('Ya existe un corte con ese nombre.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('mantiene deshabilitada la actualización masiva hasta conectarla', async () => {
    render(<DashboardPage />)
    await screen.findAllByText('Asado de tira')

    expect(screen.getByRole('button', { name: /actualizar precios/i })).toBeDisabled()
  })
})