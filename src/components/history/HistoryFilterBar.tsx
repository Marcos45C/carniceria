import { CHANGE_TYPE_LABELS, CHANGE_TYPES } from '../../features/history/labels'
import type { Cut } from '../../types/cut'
import type { ChangeType, HistoryFilters } from '../../types/history'
import { btnSecondary, inputClass } from '../ui/styles'

interface HistoryFilterBarProps {
  filters: HistoryFilters
  cuts: Cut[]
  onChange: (filters: HistoryFilters) => void
}

function isChangeType(value: string): value is ChangeType {
  return CHANGE_TYPES.some((type) => type === value)
}

export function HistoryFilterBar({ filters, cuts, onChange }: HistoryFilterBarProps) {
  const sortedCuts = [...cuts].sort((a, b) => a.name.localeCompare(b.name, 'es-AR'))
  const hasFilters = Boolean(
    filters.cutId || filters.changeType || filters.dateFrom || filters.dateTo,
  )

  return (
    <section
      aria-label="Filtros del historial"
      className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
    >
      <div>
        <label htmlFor="history-cut" className="mb-1 block text-sm font-semibold">
          Corte
        </label>
        <select
          id="history-cut"
          value={filters.cutId}
          onChange={(event) => onChange({ ...filters, cutId: event.target.value })}
          className={inputClass}
        >
          <option value="">Todos los cortes</option>
          {sortedCuts.map((cut) => (
            <option key={cut.id} value={cut.id}>
              {cut.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="history-type" className="mb-1 block text-sm font-semibold">
          Tipo de cambio
        </label>
        <select
          id="history-type"
          value={filters.changeType}
          onChange={(event) =>
            onChange({
              ...filters,
              changeType: isChangeType(event.target.value) ? event.target.value : '',
            })
          }
          className={inputClass}
        >
          <option value="">Todos los tipos</option>
          {CHANGE_TYPES.map((type) => (
            <option key={type} value={type}>
              {CHANGE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="history-from" className="mb-1 block text-sm font-semibold">
          Desde
        </label>
        <input
          id="history-from"
          type="date"
          value={filters.dateFrom}
          max={filters.dateTo || undefined}
          onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="history-to" className="mb-1 block text-sm font-semibold">
          Hasta
        </label>
        <input
          id="history-to"
          type="date"
          value={filters.dateTo}
          min={filters.dateFrom || undefined}
          onChange={(event) => onChange({ ...filters, dateTo: event.target.value })}
          className={inputClass}
        />
      </div>

      {hasFilters && (
        <div className="sm:col-span-2 lg:col-span-4">
          <button
            type="button"
            onClick={() => onChange({ cutId: '', dateFrom: '', dateTo: '', changeType: '' })}
            className={btnSecondary}
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </section>
  )
}