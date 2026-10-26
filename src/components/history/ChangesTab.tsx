import { useState } from 'react'
import { fetchHistoryPage } from '../../features/history/historyService'
import { usePagedList } from '../../features/history/usePagedList'
import type { Cut } from '../../types/cut'
import type { HistoryFilters } from '../../types/history'
import { ErrorBox, LoadingBox } from '../ui/StateBoxes'
import { btnSecondary } from '../ui/styles'
import { HistoryEntriesList, type CurrentUser } from './HistoryEntriesList'
import { HistoryFilterBar } from './HistoryFilterBar'

interface ChangesTabProps {
  cuts: Cut[]
  cutNames: Map<string, string>
  currentUser: CurrentUser | null
}

const EMPTY_FILTERS: HistoryFilters = { cutId: '', dateFrom: '', dateTo: '', changeType: '' }

export function ChangesTab({ cuts, cutNames, currentUser }: ChangesTabProps) {
  const [filters, setFilters] = useState<HistoryFilters>(EMPTY_FILTERS)
  const list = usePagedList(filters, fetchHistoryPage)

  return (
    <div className="space-y-4">
      <HistoryFilterBar filters={filters} cuts={cuts} onChange={setFilters} />

      {list.loading ? (
        <LoadingBox label="Cargando historial…" />
      ) : list.error ? (
        <ErrorBox title="No se pudo cargar el historial." message={list.error} onRetry={list.reload} />
      ) : list.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
          No hay cambios que coincidan con los filtros.
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-700">
            Mostrando <strong>{list.items.length}</strong> de <strong>{list.total}</strong> cambios
          </p>
          <HistoryEntriesList entries={list.items} cutNames={cutNames} currentUser={currentUser} />
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
        </>
      )}
    </div>
  )
}