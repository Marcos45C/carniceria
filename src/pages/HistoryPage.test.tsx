import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIXTURE_CUTS } from '../test/fixtures'
import type { PriceBatch, PriceHistoryEntry } from '../types/history'
import { HistoryPage } from './HistoryPage'

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

const historyMocks = vi.hoisted(() => ({
  fetchHistoryPage: vi.fn(),
  fetchBatchPage: vi.fn(),
  fetchBatchEntries: vi.fn(),
  revertBatch: vi.fn(),
}))

vi.mock('../features/cuts/cutsService', () => cutsMocks)
vi.mock('../features/history/historyService', () => historyMocks)

// Los tipos de cambio también aparecen como <option> en el filtro; este selector
// limita la búsqueda a las celdas de la tabla y a las etiquetas de las tarjetas.
const inList = { selector: 'td, span' }

const initial: PriceHistoryEntry = {
  id: 'h1',
  cutId: 'demo-01',
  oldPrice: null,
  newPrice: 12500,
  changedAt: '2026-10-01T12:00:00Z',
  changedBy: 'user-1',
  batchId: null,
  changeType: 'initial',
}
const individual: PriceHistoryEntry = {
  id: 'h2',
  cutId: 'demo-01',
  oldPrice: 12500,
  newPrice: 13750,
  changedAt: '2026-10-14T13:20:00Z',
  changedBy: 'user-1',
  batchId: null,
  changeType: 'individual',
}
const bulk: PriceHistoryEntry = {
  id: 'h3',
  cutId: 'demo-02',
  oldPrice: 13800,
  newPrice: 15180,
  changedAt: '2026-10-15T13:20:00Z',
  changedBy: 'user-1',
  batchId: 'batch-0001-aaaa',
  changeType: 'bulk_update',
}
const batch: PriceBatch = {
  id: 'batch-0001-aaaa',
  operationType: 'bulk_update',
  percentage: 10,
  roundingMode: 'cents',
  selectionScope: 'all_active',
  affectedCount: 1,
  createdAt: '2026-10-15T13:20:00Z',
  changedBy: 'user-1',
  originalBatchId: null,
}
const reversal: PriceBatch = {
  id: 'batch-0002-bbbb',
  operationType: 'reversal',
  percentage: null,
  roundingMode: null,
  selectionScope: null,
  affectedCount: 1,
  createdAt: '2026-10-16T10:00:00Z',
  changedBy: 'user-1',
  originalBatchId: 'batch-0001-aaaa',
}

// Cortes con el precio que dejó la actualización: no hay conflictos.
const cutsMatchingBatch = FIXTURE_CUTS.map((cut) =>
  cut.id === 'demo-02' ? { ...cut, price: 15180 } : cut,
)

function renderPage() {
  return render(
    <MemoryRouter>
      <HistoryPage />
    </MemoryRouter>,
  )
}

async function openRevertModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('tab', { name: 'Actualizaciones masivas' }))
  await screen.findByText('Aumento del 10%')
  await user.click(screen.getByRole('button', { name: 'Revertir' }))
  return within(await screen.findByRole('dialog'))
}

beforeEach(() => {
  vi.resetAllMocks()
  cutsMocks.fetchCuts.mockResolvedValue({ ok: true, data: FIXTURE_CUTS })
  historyMocks.fetchHistoryPage.mockResolvedValue({
    ok: true,
    data: { items: [bulk, individual, initial], total: 3 },
  })
  historyMocks.fetchBatchPage.mockResolvedValue({ ok: true, data: { items: [batch], total: 1 } })
  historyMocks.fetchBatchEntries.mockResolvedValue({ ok: true, data: [bulk] })
})

describe('HistoryPage', () => {
  it('muestra los cambios con su tipo, corte y variación', async () => {
    renderPage()

    expect((await screen.findAllByText('Modificación individual', inList)).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Alta inicial', inList).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Actualización masiva', inList).length).toBeGreaterThan(0)
    expect(screen.getAllByText('+10%').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Historial de precios' })).toBeInTheDocument()
  })

  it('aplica los filtros en el servidor', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findAllByText('Modificación individual', inList)

    await user.selectOptions(screen.getByLabelText('Tipo de cambio'), 'bulk_update')

    expect(historyMocks.fetchHistoryPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ changeType: 'bulk_update' }),
      0,
    )
  })

  it('carga más resultados', async () => {
    const user = userEvent.setup()
    historyMocks.fetchHistoryPage
      .mockResolvedValueOnce({ ok: true, data: { items: [bulk], total: 3 } })
      .mockResolvedValueOnce({ ok: true, data: { items: [individual, initial], total: 3 } })
    renderPage()
    await screen.findAllByText('Actualización masiva', inList)
    expect(screen.queryAllByText('Alta inicial', inList)).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Cargar más' }))

    expect((await screen.findAllByText('Alta inicial', inList)).length).toBeGreaterThan(0)
    expect(historyMocks.fetchHistoryPage).toHaveBeenLastCalledWith(expect.anything(), 1)
  })

  it('muestra el error y permite reintentar', async () => {
    const user = userEvent.setup()
    historyMocks.fetchHistoryPage
      .mockResolvedValueOnce({ ok: false, message: 'No se pudo conectar con el servidor.' })
      .mockResolvedValueOnce({ ok: true, data: { items: [individual], total: 1 } })
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor.')
    expect(screen.queryAllByText('Modificación individual', inList)).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect((await screen.findAllByText('Modificación individual', inList)).length).toBeGreaterThan(0)
  })

  it('agrupa las actualizaciones masivas y muestra sus cortes', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findAllByText('Modificación individual', inList)

    await user.click(screen.getByRole('tab', { name: 'Actualizaciones masivas' }))
    expect(await screen.findByText('Aumento del 10%')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ver cortes modificados' }))

    expect((await screen.findAllByText('Vacío')).length).toBeGreaterThan(0)
    expect(historyMocks.fetchBatchEntries).toHaveBeenCalledWith('batch-0001-aaaa')
  })
})

describe('reversión de una actualización masiva', () => {
  it('muestra qué se restaurará y revierte cuando no hay conflictos', async () => {
    const user = userEvent.setup()
    cutsMocks.fetchCuts.mockResolvedValue({ ok: true, data: cutsMatchingBatch })
    historyMocks.fetchBatchPage
      .mockResolvedValueOnce({ ok: true, data: { items: [batch], total: 1 } })
      .mockResolvedValueOnce({ ok: true, data: { items: [reversal, batch], total: 2 } })
    historyMocks.revertBatch.mockResolvedValue({
      ok: true,
      data: { batchId: 'batch-0002-bbbb', affectedCount: 1 },
    })
    renderPage()

    const dialog = await openRevertModal(user)
    expect(await dialog.findByRole('columnheader', { name: 'Se restaurará a' })).toBeInTheDocument()
    expect(dialog.getByText('Listo')).toBeInTheDocument()
    expect(historyMocks.revertBatch).not.toHaveBeenCalled() // nada se guarda antes de confirmar

    await user.click(dialog.getByRole('button', { name: 'Confirmar reversión' }))

    expect(
      await screen.findByText('Se revirtió la actualización: 1 corte restaurado.'),
    ).toBeInTheDocument()
    expect(historyMocks.revertBatch).toHaveBeenCalledWith({
      requestId: expect.any(String),
      batchId: 'batch-0001-aaaa',
    })
    expect(await screen.findByText('Revertida')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('bloquea la reversión si algún precio cambió después', async () => {
    const user = userEvent.setup()
    renderPage() // Vacío vale 13800, no 15180: cambió después de la actualización

    const dialog = await openRevertModal(user)

    expect(await dialog.findByRole('alert')).toHaveTextContent(/cambiaron después/)
    expect(dialog.getByText('Cambió después')).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: 'Confirmar reversión' })).toBeDisabled()
    expect(historyMocks.revertBatch).not.toHaveBeenCalled()
  })

  it('no ofrece revertir una actualización que ya fue revertida', async () => {
    const user = userEvent.setup()
    historyMocks.fetchBatchPage.mockResolvedValue({
      ok: true,
      data: { items: [reversal, batch], total: 2 },
    })
    renderPage()
    await screen.findAllByText('Modificación individual', inList)

    await user.click(screen.getByRole('tab', { name: 'Actualizaciones masivas' }))

    expect(await screen.findByText('Revertida')).toBeInTheDocument()
    expect(screen.getByText('Reversión de la operación batch-00')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revertir' })).not.toBeInTheDocument()
  })

  it('reutiliza la misma clave si se reintenta tras un error de red', async () => {
    const user = userEvent.setup()
    cutsMocks.fetchCuts.mockResolvedValue({ ok: true, data: cutsMatchingBatch })
    historyMocks.revertBatch
      .mockResolvedValueOnce({ ok: false, message: 'No se pudo conectar con el servidor.' })
      .mockResolvedValueOnce({ ok: true, data: { batchId: 'batch-0002-bbbb', affectedCount: 1 } })
    renderPage()

    const dialog = await openRevertModal(user)
    await dialog.findByText('Listo')
    await user.click(dialog.getByRole('button', { name: 'Confirmar reversión' }))
    expect(await dialog.findByRole('alert')).toHaveTextContent('No se pudo conectar')

    await user.click(dialog.getByRole('button', { name: 'Confirmar reversión' }))
    await screen.findByText('Se revirtió la actualización: 1 corte restaurado.')

    const [first, second] = historyMocks.revertBatch.mock.calls.map((call) => call[0])
    expect(first.requestId).toBe(second.requestId)
  })

  it('permite volver a comprobar cuando el servidor detecta cambios posteriores', async () => {
    const user = userEvent.setup()
    cutsMocks.fetchCuts.mockResolvedValue({ ok: true, data: cutsMatchingBatch })
    historyMocks.revertBatch.mockResolvedValue({
      ok: false,
      code: 'PT422',
      message: 'Algunos precios cambiaron después de esta actualización (1).',
    })
    renderPage()

    const dialog = await openRevertModal(user)
    await dialog.findByText('Listo')
    await user.click(dialog.getByRole('button', { name: 'Confirmar reversión' }))

    expect(await dialog.findByRole('alert')).toHaveTextContent(/cambiaron después/)
    expect(historyMocks.fetchBatchEntries).toHaveBeenCalledTimes(1)

    await user.click(dialog.getByRole('button', { name: 'Volver a comprobar' }))

    await dialog.findByText('Listo')
    expect(historyMocks.fetchBatchEntries).toHaveBeenCalledTimes(2)
  })
})