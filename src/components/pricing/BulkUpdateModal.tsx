import { useMemo, useState } from 'react'
import { ArrowLeft, TrendingDown, TrendingUp } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { btnPrimary, btnSecondary, inputBase, inputClass } from '../ui/styles'
import type { Cut } from '../../types/cut'
import type {
  PriceChange,
  PriceOperation,
  PreviewRow,
  RoundingMode,
  SelectionScope,
} from '../../types/pricing'
import {
  buildPreview,
  parsePercentage,
  ROUNDING_LABELS,
  ROUNDING_MODES,
} from '../../utils/pricing'
import { formatPercentage, formatPesos, formatPesosSigned } from '../../utils/format'

interface BulkUpdateModalProps {
  cuts: Cut[]
  onApply: (changes: PriceChange[], summary: string) => void
  onClose: () => void
}

interface PreviewState {
  rows: PreviewRow[]
  basisPoints: number
  operation: PriceOperation
  rounding: RoundingMode
}

export function BulkUpdateModal({ cuts, onApply, onClose }: BulkUpdateModalProps) {
  // Los cortes inactivos nunca entran en una actualización masiva normal.
  const activeCuts = useMemo(
    () =>
      cuts
        .filter((cut) => cut.isActive)
        .sort((a, b) => a.name.localeCompare(b.name, 'es-AR')),
    [cuts],
  )

  const [scope, setScope] = useState<SelectionScope>('all_active')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [operation, setOperation] = useState<PriceOperation>('increase')
  const [percentage, setPercentage] = useState('')
  const [rounding, setRounding] = useState<RoundingMode>('cents')
  const [percentageError, setPercentageError] = useState<string | null>(null)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)

  const changes = useMemo<PriceChange[]>(() => {
    if (!preview) return []
    return preview.rows.flatMap((row) =>
      row.newPrice !== null && row.newPrice !== row.oldPrice
        ? [{ cutId: row.cutId, newPrice: row.newPrice }]
        : [],
    )
  }, [preview])

  const invalidCount = preview ? preview.rows.filter((row) => row.newPrice === null).length : 0
  const unchangedCount = preview ? preview.rows.length - changes.length - invalidCount : 0
  const canConfirm = preview !== null && invalidCount === 0 && changes.length > 0

  function toggleCut(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSelectionError(null)
  }

  function handlePreview() {
    const parsed = parsePercentage(percentage, operation)
    if (!parsed.ok) {
      setPercentageError(parsed.error)
      return
    }
    const targets =
      scope === 'all_active'
        ? activeCuts
        : activeCuts.filter((cut) => selectedIds.has(cut.id))
    if (targets.length === 0) {
      setSelectionError('Seleccioná al menos un corte.')
      return
    }
    setPercentageError(null)
    setSelectionError(null)
    setPreview({
      rows: buildPreview(targets, parsed.value, operation, rounding),
      basisPoints: parsed.value,
      operation,
      rounding,
    })
  }

  function handleConfirm() {
    if (!preview || !canConfirm) return
    const label = preview.operation === 'increase' ? 'Aumento' : 'Reducción'
    onApply(changes, `${label} del ${formatPercentage(preview.basisPoints)}`)
  }

  if (preview) {
    const operationLabel = preview.operation === 'increase' ? 'Aumento' : 'Reducción'
    return (
      <Modal
        title="Vista previa de la actualización"
        onClose={onClose}
        wide
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className={btnSecondary}>
              Cancelar
            </button>
            <button type="button" onClick={handleConfirm} disabled={!canConfirm} className={btnPrimary}>
              Confirmar actualización
            </button>
          </div>
        }
      >
        <button
          type="button"
          onClick={() => setPreview(null)}
          className="mb-3 inline-flex min-h-11 items-center gap-2 font-semibold text-brand-700 hover:underline"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Cambiar configuración
        </button>

        <dl className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-gray-600">Operación</dt>
            <dd className="font-semibold">{operationLabel}</dd>
          </div>
          <div>
            <dt className="text-gray-600">Porcentaje</dt>
            <dd className="font-semibold">{formatPercentage(preview.basisPoints)}</dd>
          </div>
          <div>
            <dt className="text-gray-600">Cortes afectados</dt>
            <dd className="font-semibold">{changes.length}</dd>
          </div>
          <div>
            <dt className="text-gray-600">Redondeo</dt>
            <dd className="font-semibold">{ROUNDING_LABELS[preview.rounding]}</dd>
          </div>
        </dl>

        {invalidCount > 0 && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-error-600">
            {invalidCount === 1
              ? 'Hay 1 corte cuyo precio nuevo no sería válido (cero o negativo).'
              : `Hay ${invalidCount} cortes cuyo precio nuevo no sería válido (cero o negativo).`}{' '}
            Cambiá el porcentaje o el redondeo para continuar.
          </p>
        )}
        {unchangedCount > 0 && (
          <p className="mt-3 text-sm text-gray-700">
            {unchangedCount === 1
              ? '1 corte quedaría sin cambio y no se modificará.'
              : `${unchangedCount} cortes quedarían sin cambio y no se modificarán.`}
          </p>
        )}

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-gray-700">
              <tr className="border-b border-gray-200">
                <th scope="col" className="py-2 pr-3 font-semibold">Corte</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">Precio actual</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">Precio nuevo</th>
                <th scope="col" className="py-2 text-right font-semibold">Diferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preview.rows.map((row) => (
                <tr key={row.cutId}>
                  <td className="py-2 pr-3 font-medium">{row.name}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatPesos(row.oldPrice)}</td>
                  <td className="py-2 pr-3 text-right font-semibold tabular-nums">
                    {row.newPrice === null ? (
                      <span className="text-error-600">No válido</span>
                    ) : (
                      formatPesos(row.newPrice)
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {row.difference === null
                      ? '—'
                      : row.difference === 0
                        ? 'Sin cambio'
                        : formatPesosSigned(row.difference)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title="Actualizar precios"
      onClose={onClose}
      wide
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancelar
          </button>
          <button type="button" onClick={handlePreview} className={btnPrimary}>
            Ver vista previa
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <fieldset className="space-y-2">
          <legend className="mb-1 font-semibold">¿Qué cortes querés actualizar?</legend>
          <label className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-300 p-3">
            <input
              type="radio"
              name="scope"
              checked={scope === 'all_active'}
              onChange={() => setScope('all_active')}
              className="size-5 accent-brand-700"
            />
            Todos los cortes activos ({activeCuts.length})
          </label>
          <label className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-300 p-3">
            <input
              type="radio"
              name="scope"
              checked={scope === 'selected'}
              onChange={() => setScope('selected')}
              className="size-5 accent-brand-700"
            />
            Solo los que seleccione ({selectedIds.size} seleccionados)
          </label>

          {scope === 'selected' && (
            <div className="rounded-lg border border-gray-200 p-2">
              <div className="mb-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIds(new Set(activeCuts.map((cut) => cut.id)))
                    setSelectionError(null)
                  }}
                  className="min-h-10 rounded-md px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                >
                  Seleccionar todos
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="min-h-10 rounded-md px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                >
                  Ninguno
                </button>
              </div>
              <ul className="max-h-56 overflow-y-auto">
                {activeCuts.map((cut) => (
                  <li key={cut.id}>
                    <label className="flex min-h-11 items-center gap-3 px-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(cut.id)}
                        onChange={() => toggleCut(cut.id)}
                        className="size-5 accent-brand-700"
                      />
                      <span className="flex-1">{cut.name}</span>
                      <span className="text-sm text-gray-600 tabular-nums">{formatPesos(cut.price)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {selectionError && (
            <p role="alert" className="text-sm text-error-600">
              {selectionError}
            </p>
          )}
        </fieldset>

        <div>
          <p className="mb-1 font-semibold">Tipo de actualización</p>
          <div role="group" aria-label="Tipo de actualización" className="grid grid-cols-2 gap-2">
            {(['increase', 'decrease'] as const).map((op) => (
              <button
                key={op}
                type="button"
                aria-pressed={operation === op}
                onClick={() => {
                  setOperation(op)
                  setPercentageError(null)
                }}
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 px-3 font-semibold ${
                  operation === op
                    ? 'border-brand-700 bg-brand-50 text-brand-800'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                {op === 'increase' ? (
                  <TrendingUp size={20} aria-hidden="true" />
                ) : (
                  <TrendingDown size={20} aria-hidden="true" />
                )}
                {op === 'increase' ? 'Aumentar' : 'Reducir'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="bulk-percentage" className="mb-1 block font-semibold">
            Porcentaje
          </label>
          <div className="relative">
            <input
              id="bulk-percentage"
              type="text"
              inputMode="decimal"
              placeholder="Ej.: 10 o 7,5"
              value={percentage}
              onChange={(event) => {
                setPercentage(event.target.value)
                setPercentageError(null)
              }}
              aria-invalid={percentageError !== null}
              aria-describedby={percentageError ? 'bulk-percentage-error' : undefined}
              className={`${inputBase} pl-3 pr-10`}
            />
            <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">
              %
            </span>
          </div>
          {percentageError && (
            <p id="bulk-percentage-error" role="alert" className="mt-1 text-sm text-error-600">
              {percentageError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="bulk-rounding" className="mb-1 block font-semibold">
            Redondeo
          </label>
          <select
            id="bulk-rounding"
            value={rounding}
            onChange={(event) => setRounding(event.target.value as RoundingMode)}
            className={inputClass}
          >
            {ROUNDING_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {ROUNDING_LABELS[mode]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-600">
            El precio se redondea al valor más cercano. Si queda justo a la mitad, sube.
          </p>
        </div>
      </div>
    </Modal>
  )
}