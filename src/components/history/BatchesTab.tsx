import { useEffect, useState } from 'react'
import { fetchBatchEntries, fetchBatchPage } from '../../features/history/historyService'
import { NO_FILTERS, usePagedList } from '../../features/history/usePagedList'
import type { PriceBatch, PriceHistoryEntry } from '../../types/history'
import type { Result } from '../../types/result'
import { formatDateTime, formatPercentage } from '../../utils/format'
import { ROUNDING_LABELS } from '../../utils/pricing'
import { ErrorBox, LoadingBox } from '../ui/StateBoxes'
import { btnSecondary } from '../ui/styles'
import { HistoryEntriesList, type CurrentUser } from './HistoryEntriesList'

interface Shared {
  cutNames: Map<string, string>
  currentUser: CurrentUser | null
}

function describeBatch(batch: PriceBatch): string {
  if (batch.operationType === 'reversal') return 'Reversión de una actualización masiva'
  const percentage = formatPercentage(Math.round(Math.abs(batch.percentage ?? 0) * 100))
  return `${(batch.percentage ?? 0) >= 0 ? 'Aumento' : 'Reducción'} del ${percentage}`
}

interface BatchEntriesState {
  batchId: string
  token: number
  result: Result<PriceHistoryEntry[]>
}

function BatchEntries({ batchId, cutNames, currentUser }: Shared & { batchId: string }) {
  const [token, setToken] = useState(0)
  const [state, setState] = useState<BatchEntriesState | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchBatchEntries(batchId).then((result) => {
      if (!cancelled) setState({ batchId, token, result })
    })
    return () => {
      cancelled = true
    }
  }, [batchId, token])

  if (state === null || state.batchId !== batchId || state.token !== token) {
    return <LoadingBox label="Cargando cortes…" />
  }
  if (!state.result.ok) {
    return (
      <ErrorBox
        title="No se pudieron cargar los cortes."
        message={state.result.message}
        onRetry={() => setToken((previous) => previous + 1)}
      />
    )
  }

  const entries = [...state.result.data].sort((a, b) =>
    (cutNames.get(a.cutId) ?? '').localeCompare(cutNames.get(b.cutId) ?? '', 'es-AR'),
  )
  return <HistoryEntriesList entries={entries} cutNames={cutNames} currentUser={currentUser} />
}

function BatchCard({ batch, cutNames, currentUser }: Shared & { batch: PriceBatch }) {
  const [open, setOpen] = useState(false)

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{describeBatch(batch)}</h3>
          <p className="text-sm text-gray-600">
            {formatDateTime(batch.createdAt)} · {batch.affectedCount}{' '}
            {batch.affectedCount === 1 ? 'corte modificado' : 'cortes modificados'}
          </p>
          {batch.operationType === 'bulk_update' && (
            <p className="text-sm text-gray-600">
              {batch.selectionScope === 'selected'
                ? 'Cortes seleccionados'
                : 'Todos los cortes activos'}
              {batch.roundingMode ? ` · ${ROUNDING_LABELS[batch.roundingMode]}` : ''}
            </p>
          )}
          <p className="text-xs text-gray-500">Operación {batch.id.slice(0, 8)}</p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((previous) => !previous)}
          className={btnSecondary}
        >
          {open ? 'Ocultar cortes' : 'Ver cortes modificados'}
        </button>
      </div>

      {open && (
        <div className="mt-3">
          <BatchEntries batchId={batch.id} cutNames={cutNames} currentUser={currentUser} />
        </div>
      )}
    </li>
  )
}

export function BatchesTab({ cutNames, currentUser }: Shared) {
  const list = usePagedList(NO_FILTERS, fetchBatchPage)

  if (list.loading) return <LoadingBox label="Cargando operaciones…" />
  if (list.error) {
    return (
      <ErrorBox title="No se pudieron cargar las operaciones." message={list.error} onRetry={list.reload} />
    )
  }
  if (list.items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
        Todavía no hay actualizaciones masivas.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {list.items.map((batch) => (
          <BatchCard key={batch.id} batch={batch} cutNames={cutNames} currentUser={currentUser} />
        ))}
      </ul>
      {list.moreError && (
        <p role="alert" className="text-sm text-error-600">
          {list.moreError}
        </p>
      )}
      {list.items.length < list.total && (
        <button
          type="button"
          onClick={() => {
            void list.loadMore()
          }}
          disabled={list.loadingMore}
          className={`${btnSecondary} w-full`}
        >
          {list.loadingMore ? 'Cargando…' : 'Cargar más'}
        </button>
      )}
    </div>
  )
}