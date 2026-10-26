import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { AppHeader } from '../components/layout/AppHeader'
import { CutsToolbar } from '../components/cuts/CutsToolbar'
import { CutsList } from '../components/cuts/CutsList'
import { CutFormModal } from '../components/cuts/CutFormModal'
import { BulkUpdateModal } from '../components/pricing/BulkUpdateModal'
import { ErrorBox, LoadingBox } from '../components/ui/StateBoxes'
import { btnPrimary, btnSecondary } from '../components/ui/styles'
import { useAuth } from '../features/auth/useAuth'
import { filterCuts, getCategories, type ValidCutData } from '../features/cuts/cutRules'
import { useCuts } from '../features/cuts/useCuts'
import type { Cut, CutFilters } from '../types/cut'
import type { BulkUpdateOutcome, BulkUpdateRequest } from '../types/pricing'
import type { Result } from '../types/result'
import { formatPercentage, formatPesos } from '../utils/format'

type CutFormState = { mode: 'create' } | { mode: 'edit'; cut: Cut } | null

export function DashboardPage() {
  const { user, signOut } = useAuth()
  const { cuts, status, loadError, retry, savePrice, addCut, updateCut, applyBulk } = useCuts()
  const [filters, setFilters] = useState<CutFilters>({
    search: '',
    category: '',
    status: 'active',
  })
  const [cutForm, setCutForm] = useState<CutFormState>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const visibleCuts = useMemo(() => filterCuts(cuts, filters), [cuts, filters])
  const categories = useMemo(() => getCategories(cuts), [cuts])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  async function handleSavePrice(id: string, newPrice: number, expectedPrice: number) {
    const result = await savePrice(id, newPrice, expectedPrice)
    if (result.ok) {
      setNotice(`Precio de ${result.data.name} actualizado a ${formatPesos(result.data.price)}.`)
    }
    return result
  }

  async function handleSubmitCut(data: ValidCutData): Promise<Result<Cut>> {
    if (cutForm?.mode === 'edit') {
      const result = await updateCut(cutForm.cut.id, {
        name: data.name,
        category: data.category,
        unit: data.unit,
        isActive: data.isActive,
      })
      if (result.ok) {
        setNotice(`Corte «${result.data.name}» actualizado.`)
        setCutForm(null)
      }
      return result
    }

    if (data.priceCents === undefined) {
      return { ok: false, message: 'Ingresá un precio válido.' }
    }
    const result = await addCut({
      name: data.name,
      category: data.category,
      unit: data.unit,
      price: data.priceCents / 100,
      isActive: data.isActive,
    })
    if (result.ok) {
      setNotice(`Corte «${result.data.name}» agregado.`)
      setCutForm(null)
    }
    return result
  }

  async function handleBulkApply(request: BulkUpdateRequest): Promise<Result<BulkUpdateOutcome>> {
    const result = await applyBulk(request)
    if (result.ok) {
      setBulkOpen(false)
      const label = request.operation === 'increase' ? 'Aumento' : 'Reducción'
      const count = result.data.affectedCount
      setNotice(
        `${label} del ${formatPercentage(request.basisPoints)}: ${count} ${
          count === 1 ? 'corte actualizado' : 'cortes actualizados'
        }.`,
      )
    }
    return result
  }

  return (
    <div className="min-h-screen">
      <AppHeader
        email={user?.email}
        onSignOut={() => {
          void signOut()
        }}
      />

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-4 pb-24">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            disabled={status !== 'ready'}
            className={`${btnPrimary} py-4 text-lg`}
          >
            <RefreshCw size={22} aria-hidden="true" />
            Actualizar precios
          </button>
          <button
            type="button"
            onClick={() => setCutForm({ mode: 'create' })}
            disabled={status !== 'ready'}
            className={`${btnSecondary} py-4 text-lg`}
          >
            <Plus size={22} aria-hidden="true" />
            Agregar corte
          </button>
        </div>

        {status === 'loading' && <LoadingBox label="Cargando cortes…" />}

        {status === 'error' && (
          <ErrorBox
            title="No se pudieron cargar los cortes."
            message={loadError}
            onRetry={() => {
              void retry()
            }}
          />
        )}

        {status === 'ready' && (
          <>
            <CutsToolbar filters={filters} categories={categories} onChange={setFilters} />

            <p className="text-sm text-gray-700">
              Mostrando <strong>{visibleCuts.length}</strong> de <strong>{cuts.length}</strong> cortes
              registrados
            </p>

            <CutsList
              cuts={visibleCuts}
              onSavePrice={handleSavePrice}
              onEditCut={(cut) => setCutForm({ mode: 'edit', cut })}
            />
          </>
        )}
      </main>

      {bulkOpen && (
        <BulkUpdateModal cuts={cuts} onApply={handleBulkApply} onClose={() => setBulkOpen(false)} />
      )}

      {cutForm && (
        <CutFormModal
          mode={cutForm.mode}
          cut={cutForm.mode === 'edit' ? cutForm.cut : undefined}
          cuts={cuts}
          categories={categories}
          onSubmit={handleSubmitCut}
          onClose={() => setCutForm(null)}
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
    </div>
  )
}