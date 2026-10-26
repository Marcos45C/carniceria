import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIXTURE_CUTS } from '../test/fixtures'
import { DashboardPage } from './DashboardPage'

vi.mock('../features/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'carnicero@demo.local' },
    signOut: vi.fn(),
  }),
}))

const cutsMocks = vi.hoisted(() => ({
  fetchCuts: vi.fn(),
  createCut: vi.fn(),
  updateCutDetails: vi.fn(),
  setCutPrice: vi.fn(),
  applyBulkUpdate: vi.fn(),
}))

vi.mock('../features/cuts/cutsService', () => cutsMocks)

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

async function openBulkPreview(user: ReturnType<typeof userEvent.setup>, percentage: string) {
  await user.click(screen.getByRole('button', { name: /actualizar precios/i }))
  const dialog = screen.getByRole('dialog')
  await user.type(within(dialog).getByLabelText('Porcentaje'), percentage)
  await user.click(within(dialog).getByRole('button', { name: 'Ver vista previa' }))
  return within(screen.getByRole('dialog'))
}

beforeEach(() => {
  vi.resetAllMocks()
  cutsMocks.fetchCuts.mockResolvedValue({ ok: true, data: FIXTURE_CUTS })
})

describe('DashboardPage', () => {
  it('muestra "cargando" y luego los cortes del servidor', async () => {
    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Cargando cortes')
    expect((await screen.findAllByText('Asado de tira')).length).toBeGreaterThan(0)
    expect(screen.getByText('carnicero@demo.local')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Historial' })).toHaveAttribute('href', '/historial')
    expect(cutsMocks.fetchCuts).toHaveBeenCalledTimes(1)
  })

  it('muestra el error de carga y permite reintentar', async () => {
    const user = userEvent.setup()
    cutsMocks.fetchCuts
      .mockResolvedValueOnce({ ok: false, message: 'No se pudo conectar con el servidor.' })
      .mockResolvedValueOnce({ ok: true, data: FIXTURE_CUTS })
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor.')

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect((await screen.findAllByText('Asado de tira')).length).toBeGreaterThan(0)
  })

  it('filtra los cortes al buscar por nombre', async () => {
    const user = userEvent.setup()
    renderPage()
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
    renderPage()
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
    renderPage()
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
    renderPage()
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
    renderPage()
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
})

describe('actualización masiva', () => {
  it('muestra la vista previa y aplica la actualización cuando se confirma', async () => {
    const user = userEvent.setup()
    cutsMocks.applyBulkUpdate.mockResolvedValue({
      ok: true,
      data: { batchId: 'batch-1', affectedCount: 12 },
    })
    renderPage()
    await screen.findAllByText('Asado de tira')

    const dialog = await openBulkPreview(user, '10')
    expect(dialog.getByText('Vista previa de la actualización')).toBeInTheDocument()
    expect(cutsMocks.applyBulkUpdate).not.toHaveBeenCalled() // nada se guarda antes de confirmar

    await user.click(dialog.getByRole('button', { name: 'Confirmar actualización' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Aumento del 10%: 12 cortes actualizados.',
    )
    expect(cutsMocks.applyBulkUpdate).toHaveBeenCalledTimes(1)
    const request = cutsMocks.applyBulkUpdate.mock.calls[0][0]
    expect(request).toMatchObject({
      scope: 'all_active',
      operation: 'increase',
      basisPoints: 1000,
      rounding: 'cents',
    })
    expect(request.expected).toHaveLength(12) // solo los cortes activos
    expect(request.expected).toContainEqual({ id: 'demo-01', price: 12500 })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('no guarda nada si se cancela desde la vista previa', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findAllByText('Asado de tira')

    const dialog = await openBulkPreview(user, '10')
    await user.click(dialog.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(cutsMocks.applyBulkUpdate).not.toHaveBeenCalled()
  })

  it('valida el porcentaje antes de mostrar la vista previa', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findAllByText('Asado de tira')

    await user.click(screen.getByRole('button', { name: /actualizar precios/i }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Ver vista previa' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(/porcentaje válido/)
    expect(cutsMocks.applyBulkUpdate).not.toHaveBeenCalled()
  })

  it('reutiliza la misma clave si se reintenta tras un error de red', async () => {
    const user = userEvent.setup()
    cutsMocks.applyBulkUpdate
      .mockResolvedValueOnce({ ok: false, message: 'No se pudo conectar con el servidor.' })
      .mockResolvedValueOnce({ ok: true, data: { batchId: 'batch-1', affectedCount: 12 } })
    renderPage()
    await screen.findAllByText('Asado de tira')

    const dialog = await openBulkPreview(user, '10')
    await user.click(dialog.getByRole('button', { name: 'Confirmar actualización' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar')

    await user.click(dialog.getByRole('button', { name: 'Confirmar actualización' }))
    await screen.findByRole('status')

    const [first, second] = cutsMocks.applyBulkUpdate.mock.calls.map((call) => call[0])
    expect(first.requestId).toBe(second.requestId)
  })

  it('permite calcular de nuevo cuando los precios cambiaron', async () => {
    const user = userEvent.setup()
    cutsMocks.applyBulkUpdate
      .mockResolvedValueOnce({
        ok: false,
        code: 'PT412',
        message: 'Los precios cambiaron desde que se calculó la vista previa.',
      })
      .mockResolvedValueOnce({ ok: true, data: { batchId: 'batch-1', affectedCount: 12 } })
    renderPage()
    await screen.findAllByText('Asado de tira')

    const dialog = await openBulkPreview(user, '10')
    await user.click(dialog.getByRole('button', { name: 'Confirmar actualización' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/cambiaron/)
    expect(cutsMocks.fetchCuts).toHaveBeenCalledTimes(2) // la lista se recargó

    await user.click(dialog.getByRole('button', { name: 'Calcular de nuevo' }))
    await user.click(dialog.getByRole('button', { name: 'Confirmar actualización' }))
    await screen.findByRole('status')

    const [first, second] = cutsMocks.applyBulkUpdate.mock.calls.map((call) => call[0])
    expect(first.requestId).not.toBe(second.requestId) // es una solicitud nueva
  })
})