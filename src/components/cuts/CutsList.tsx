import { Settings2 } from 'lucide-react'
import type { Cut } from '../../types/cut'
import { useInlinePriceEdit, type SavePrice } from '../../features/cuts/useInlinePriceEdit'
import { formatDateTime, formatPesos } from '../../utils/format'
import { PriceActions, PriceInput } from './PriceEditControls'

interface CutItemProps {
  cut: Cut
  onSavePrice: SavePrice
  onEditCut: (cut: Cut) => void
}

interface CutsListProps {
  cuts: Cut[]
  onSavePrice: SavePrice
  onEditCut: (cut: Cut) => void
}

function InactiveBadge() {
  return (
    <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
      Inactivo
    </span>
  )
}

function CutTableRow({ cut, onSavePrice, onEditCut }: CutItemProps) {
  const edit = useInlinePriceEdit(cut, onSavePrice)

  return (
    <tr className={cut.isActive ? 'bg-white' : 'bg-gray-50 text-gray-600'}>
      <td className="px-4 py-3 font-medium">
        {cut.name}
        {!cut.isActive && <InactiveBadge />}
      </td>
      <td className="px-4 py-3">{cut.category ?? '—'}</td>
      <td className="w-56 px-4 py-3">
        {edit.editing ? (
          <PriceInput edit={edit} cutName={cut.name} />
        ) : (
          <span className="text-lg font-semibold tabular-nums">
            {formatPesos(cut.price)}
            <span className="font-normal text-gray-600"> / {cut.unit}</span>
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(cut.priceUpdatedAt)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <PriceActions edit={edit} cutName={cut.name} />
          <button
            type="button"
            onClick={() => onEditCut(cut)}
            aria-label={`Editar datos de ${cut.name}`}
            title="Editar datos del corte"
            className="inline-flex size-11 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <Settings2 size={20} aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  )
}

function CutCard({ cut, onSavePrice, onEditCut }: CutItemProps) {
  const edit = useInlinePriceEdit(cut, onSavePrice)

  return (
    <li
      className={`rounded-xl border border-gray-200 p-4 shadow-sm ${
        cut.isActive ? 'bg-white' : 'bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold leading-tight">
            {cut.name}
            {!cut.isActive && <InactiveBadge />}
          </h3>
          <p className="text-sm text-gray-600">{cut.category ?? 'Sin categoría'}</p>
        </div>
        <button
          type="button"
          onClick={() => onEditCut(cut)}
          aria-label={`Editar datos de ${cut.name}`}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <Settings2 size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3">
        {edit.editing ? (
          <PriceInput edit={edit} cutName={cut.name} />
        ) : (
          <p className="text-2xl font-bold tabular-nums">
            {formatPesos(cut.price)}
            <span className="text-base font-normal text-gray-600"> / {cut.unit}</span>
          </p>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-600">
        Precio modificado: {formatDateTime(cut.priceUpdatedAt)}
      </p>

      <PriceActions edit={edit} cutName={cut.name} fullWidth className="mt-3" />
    </li>
  )
}

export function CutsList({ cuts, onSavePrice, onEditCut }: CutsListProps) {
  if (cuts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
        No hay cortes que coincidan con la búsqueda o los filtros.
      </div>
    )
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm lg:block">        <table className="w-full text-left">
          <thead className="bg-gray-100 text-sm text-gray-700">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Corte</th>
              <th scope="col" className="px-4 py-3 font-semibold">Categoría</th>
              <th scope="col" className="px-4 py-3 font-semibold">Precio actual</th>
              <th scope="col" className="px-4 py-3 font-semibold">Última modificación</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {cuts.map((cut) => (
              <CutTableRow key={cut.id} cut={cut} onSavePrice={onSavePrice} onEditCut={onEditCut} />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 lg:hidden">
        {cuts.map((cut) => (
          <CutCard key={cut.id} cut={cut} onSavePrice={onSavePrice} onEditCut={onEditCut} />
        ))}
      </ul>
    </>
  )
}