import { Search } from 'lucide-react'
import type { CutFilters, StatusFilter } from '../../types/cut'
import { inputBase, inputClass } from '../ui/styles'

interface CutsToolbarProps {
  filters: CutFilters
  categories: string[]
  onChange: (filters: CutFilters) => void
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
  { value: 'all', label: 'Todos' },
]

export function CutsToolbar({ filters, categories, onChange }: CutsToolbarProps) {
  return (
    <section
      aria-label="Búsqueda y filtros"
      className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="relative">
        <Search
          size={20}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
        />
        <input
          type="search"
          aria-label="Buscar corte por nombre"
          placeholder="Buscar corte por nombre"
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          className={`${inputBase} pl-10 pr-3`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <select
          aria-label="Filtrar por categoría"
          value={filters.category}
          onChange={(event) => onChange({ ...filters, category: event.target.value })}
          className={inputClass}
        >
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <div
          role="group"
          aria-label="Estado de los cortes"
          className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1"
        >
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filters.status === option.value}
              onClick={() => onChange({ ...filters, status: option.value })}
              className={`min-h-11 flex-1 whitespace-nowrap rounded-md px-3 text-sm font-semibold ${
                filters.status === option.value
                  ? 'bg-white text-brand-800 shadow-sm'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}