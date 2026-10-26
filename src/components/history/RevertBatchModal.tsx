import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { fetchCuts } from '../../features/cuts/cutsService'
import { fetchBatchEntries, revertBatch } from '../../features/history/historyService'
import { describeBatch } from '../../features/history/labels'
import type { Cut } from '../../types/cut'
import type { PriceBatch, PriceHistoryEntry } from '../../types/history'
import type { BulkUpdateOutcome } from '../../types/pricing'
import type { Result } from '../../types/result'
import { formatDateTime, formatPesos } from '../../utils/format'
import { newUuid } from '../../utils/uuid'
import { Modal } from '../ui/Modal'
import { ErrorBox, LoadingBox } from '../ui/StateBoxes'
import { btnPrimary, btnSecondary } from '../ui/styles'

interface RevertBatchModalProps {
  batch: PriceBatch
  onClose: () => void
  onReverted: (outcome: BulkUpdateOutcome) => void
  /** Se llama cuando el servidor indica que la lista quedó desactualizada. */
  onStale: () => void
}

interface Loaded {
  token: number
  entries: Result<PriceHistoryEntry[]>
  cuts: Result<Cut[]>
}

interface RevertRow {
  cutId: string
  name: string
  /** Precio que tiene hoy el corte (null si ya no existe). */
  currentPrice: number | null
  /** Precio que dejó la actualización: es el que debería tener hoy. */
  expectedPrice: number
  /** Precio al que volvería. */
  restorePrice: number
  conflict: boolean
}

interface ServerError {
  message: string
  recheck: boolean
}

export function RevertBatchModal({ batch, onClose, onReverted, onStale }: RevertBatchModalProps) {
  // Se genera una sola vez: si se reintenta el envío, el servidor lo reconoce.
  const [requestId] = useState(newUuid)
  const [token, setToken] = useState(0)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<ServerError | null>(null)

  useEffect(() => {
    let cancelled = false
    void Promise.all([fetchBatchEntries(batch.id), fetchCuts()]).then(([entries, cuts]) => {
      if (!cancelled) setLoaded({ token, entries, cuts })
    })
    return () => {
      cancelled = true
    }
  }, [batch.id, token])

  const loading = loaded === null || loaded.token !== token

  const loadError = useMemo(() => {
    if (!loaded || loaded.token !== token) return null
    if (!loaded.entries.ok) return loaded.entries.message
    if (!loaded.cuts.ok) return loaded.cuts.message
    return null
  }, [loaded, token])

  const rows = useMemo<RevertRow[] | null>(() => {
    if (!loaded || loaded.token !== token || !loaded.entries.ok || !loaded.cuts.ok) return null
    const cutsById = new Map(loaded.cuts.data.map((cut) => [cut.id, cut]))
    return loaded.entries.data
      .map((entry) => {
        const cut = cutsById.get(entry.cutId)
        const currentPrice = cut ? cut.price : null
        return {
          cutId: entry.cutId,
          name: cut?.name ?? 'Corte desconocido',
          currentPrice,
          expectedPrice: entry.newPrice,
          restorePrice: entry.oldPrice ?? entry.newPrice,
          conflict: currentPrice === null || currentPrice !== entry.newPrice,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es-AR'))
  }, [loaded, token])

  const conflicts = rows ? rows.filter((row) => row.conflict).length : 0
  const canConfirm = rows !== null && rows.length > 0 && conflicts === 0 && !submitting

  async function handleConfirm() {
    if (!canConfirm) return // evita envíos duplicados
    setSubmitting(true)
    setServerError(null)
    try {
      const result = await revertBatch({ requestId, batchId: batch.id })
      if (result.ok) {
        onReverted(result.data)
        return
      }
      if (result.code === 'PT410' || result.code === 'PT404') onStale()
      setServerError({ message: result.message, recheck: result.code === 'PT422' })
    } catch {
      setServerError({ message: 'Ocurrió un error inesperado. Intentá de nuevo.', recheck: false })
    }
    setSubmitting(false)
  }

  function recheck() {
    setServerError(null)
    setToken((previous) => previous + 1)
  }

  return (
    <Modal
      title="Revertir actualización"
      onClose={onClose}
      wide
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={submitting} className={btnSecondary}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirm()
            }}
            disabled={!canConfirm}
            className={btnPrimary}
          >
            {submitting && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
            {submitting ? 'Revirtiendo…' : 'Confirmar reversión'}
          </button>
        </div>
      }
    >
      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-gray-600">Actualización</dt>
          <dd className="font-semibold">{describeBatch(batch)}</dd>
        </div>
        <div>
          <dt className="text-gray-600">Fecha</dt>
          <dd className="font-semibold">{formatDateTime(batch.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-gray-600">Cortes</dt>
          <dd className="font-semibold">{batch.affectedCount}</dd>
        </div>
        <div>
          <dt className="text-gray-600">Operación</dt>
          <dd className="font-semibold">{batch.id.slice(0, 8)}</dd>
        </div>
      </dl>

      {loading && (
        <div className="mt-3">
          <LoadingBox label="Comprobando precios actuales…" />
        </div>
      )}

      {loadError && (
        <div className="mt-3">
          <ErrorBox title="No se pudieron cargar los datos." message={loadError} onRetry={recheck} />
        </div>
      )}

      {rows && (
        <>
          {conflicts > 0 && (
            <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-error-600">
              Algunos precios cambiaron después de esta actualización ({conflicts}). Para no pisar
              esos cambios, no se puede revertir ahora.
            </p>
          )}

          {serverError && (
            <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-error-600">
              <p>{serverError.message}</p>
              {serverError.recheck && (
                <button type="button" onClick={recheck} className={`${btnSecondary} mt-2`}>
                  Volver a comprobar
                </button>
              )}
            </div>
          )}

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-gray-700">
                <tr className="border-b border-gray-200">
                  <th scope="col" className="py-2 pr-3 font-semibold">Corte</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">Precio actual</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">Se restaurará a</th>
                  <th scope="col" className="py-2 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.cutId}>
                    <td className="py-2 pr-3 font-medium">{row.name}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {row.currentPrice === null ? '—' : formatPesos(row.currentPrice)}
                    </td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums">
                      {formatPesos(row.restorePrice)}
                    </td>
                    <td className={`py-2 font-medium ${row.conflict ? 'text-error-600' : 'text-ok-600'}`}>
                      {row.conflict ? 'Cambió después' : 'Listo'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  )
}