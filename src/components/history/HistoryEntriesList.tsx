import { CHANGE_TYPE_LABELS } from '../../features/history/labels'
import type { PriceHistoryEntry } from '../../types/history'
import { formatDateTime, formatPesos, formatVariation } from '../../utils/format'

export interface CurrentUser {
  id: string
  email?: string
}

interface HistoryEntriesListProps {
  entries: PriceHistoryEntry[]
  cutNames: Map<string, string>
  currentUser: CurrentUser | null
}

function userLabel(entry: PriceHistoryEntry, currentUser: CurrentUser | null): string {
  if (currentUser && entry.changedBy === currentUser.id) return currentUser.email ?? 'Vos'
  return 'Otro usuario'
}

function batchLabel(entry: PriceHistoryEntry): string {
  return entry.batchId ? entry.batchId.slice(0, 8) : '—'
}

export function HistoryEntriesList({ entries, cutNames, currentUser }: HistoryEntriesListProps) {
  const nameOf = (entry: PriceHistoryEntry) => cutNames.get(entry.cutId) ?? 'Corte desconocido'

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm lg:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Fecha y hora</th>
              <th scope="col" className="px-4 py-3 font-semibold">Corte</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Anterior</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Nuevo</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Variación</th>
              <th scope="col" className="px-4 py-3 font-semibold">Usuario</th>
              <th scope="col" className="px-4 py-3 font-semibold">Tipo</th>
              <th scope="col" className="px-4 py-3 font-semibold">Lote</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-4 py-3 text-gray-700">{formatDateTime(entry.changedAt)}</td>
                <td className="px-4 py-3 font-medium">{nameOf(entry)}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {entry.oldPrice === null ? '—' : formatPesos(entry.oldPrice)}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {formatPesos(entry.newPrice)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatVariation(entry.oldPrice, entry.newPrice)}
                </td>
                <td className="px-4 py-3 text-gray-700">{userLabel(entry, currentUser)}</td>
                <td className="px-4 py-3">{CHANGE_TYPE_LABELS[entry.changeType]}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600" title={entry.batchId ?? undefined}>
                  {batchLabel(entry)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 lg:hidden">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold leading-tight">{nameOf(entry)}</h3>
              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                {CHANGE_TYPE_LABELS[entry.changeType]}
              </span>
            </div>
            <p className="mt-2 text-lg tabular-nums">
              {entry.oldPrice === null ? '—' : formatPesos(entry.oldPrice)}
              <span aria-hidden="true"> → </span>
              <span className="sr-only"> a </span>
              <strong>{formatPesos(entry.newPrice)}</strong>
              <span className="ml-2 text-sm text-gray-600">
                {formatVariation(entry.oldPrice, entry.newPrice)}
              </span>
            </p>
            <p className="mt-1 text-xs text-gray-600">
              {formatDateTime(entry.changedAt)} · {userLabel(entry, currentUser)}
              {entry.batchId ? ` · Lote ${batchLabel(entry)}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </>
  )
}