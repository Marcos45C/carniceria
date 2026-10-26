import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchBatchEntries, fetchBatchPage } from '../../features/history/historyService'
import { describeBatch } from '../../features/history/labels'
import { NO_FILTERS, usePagedList } from '../../features/history/usePagedList'
import type { PriceBatch, PriceHistoryEntry } from '../../types/history'
import type { Result } from '../../types/result'
import { formatDateTime } from '../../utils/format'
import { ROUNDING_LABELS } from '../../utils/pricing'
import { ErrorBox, LoadingBox } from '../ui/StateBoxes'
import { btnSecondary } from '../ui/styles'
import { HistoryEntriesList, type CurrentUser } from './HistoryEntriesList'
import { RevertBatchModal } from './RevertBatchModal'

interface Shared {
  cutNames: Map<string, string>
  currentUser: CurrentUser | null
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

interface BatchCardProps extends Shared {
  batch: PriceBatch
  reverted: boolean
  onRevert: (batch: PriceBatch) => void
}

function BatchCard({ batch, reverted, onRevert, cutNames, currentUser }: BatchCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">
            {describeBatch(batch)}
            {reverted && (
              <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                Revertida
              </span>
            )}
          </h3>
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((previous) => !previous)}
            className={btnSecondary}
          >
            {open ? 'Ocultar cortes' : 'Ver cortes modificados'}
          </button>
          {batch.operationType === 'bulk_update' && !reverted && (
            <button type="button" onClick={() => onRevert(batch)} className={btnSecondary}>
              Revertir
            </button>
          )}
        </div>
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
  const [reverting, setReverting] = useState<PriceBatch | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  // Una reversión siempre es más nueva que la actualización que revierte,
  // así que aparece antes en la lista ordenada por fecha descendente.
  const revertedIds = useMemo(
    () =>
      new Set(
        list.items.flatMap((batch) => (batch.originalBatchId ? [batch.originalBatchId] : [])),
      ),
    [list.items],
  )

  let content: ReactNode
  if (list.error) {
    content = (
      <ErrorBox title="No se pudieron cargar las operaciones." message={list.error} onRetry={list.reload} />
    )
  } else if (list.loading && list.items.length === 0) {
    content = <LoadingBox label="Cargando operaciones…" />
  } else if (list.items.length === 0) {
    content = (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
        Todavía no hay actualizaciones masivas.
      </div>
    )
  } else {
    content = (
      <div className="space-y-4">
        <ul className="space-y-3">
          {list.items.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              reverted={revertedIds.has(batch.id)}
              onRevert={setReverting}
              cutNames={cutNames}
              currentUser={currentUser}
            />
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

  return (
    <>
      {content}

      {reverting && (
        <RevertBatchModal
          batch={reverting}
          onClose={() => setReverting(null)}
          onStale={list.reload}
          onReverted={(outcome) => {
            setReverting(null)
            setNotice(
              `Se revirtió la actualización: ${outcome.affectedCount} ${
                outcome.affectedCount === 1 ? 'corte restaurado' : 'cortes restaurados'
              }.`,
            )
            list.reload()
          }}
        />
      )}

      {notice && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-lg bg-ok-600 px-4 py-3 font-medium text-white shadow-lg"
        >
          {notice}
        </div>
      )}
    </>
  )
}