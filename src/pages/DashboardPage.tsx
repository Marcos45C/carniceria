import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { AppHeader } from '../components/layout/AppHeader'
import { CutsToolbar } from '../components/cuts/CutsToolbar'
import { CutsList } from '../components/cuts/CutsList'
import { CutFormModal } from '../components/cuts/CutFormModal'
import { BulkUpdateModal } from '../components/pricing/BulkUpdateModal'
import { btnPrimary, btnSecondary } from '../components/ui/styles'
import { filterCuts, getCategories, type ValidCutData } from '../features/cuts/cutRules'
import { useDemoCuts } from '../features/cuts/useDemoCuts'
import type { Cut, CutFilters } from '../types/cut'
import type { PriceChange } from '../types/pricing'
import { formatPesos } from '../utils/format'

type CutFormState = { mode: 'create' } | { mode: 'edit'; cut: Cut } | null

export function DashboardPage() {
  const { cuts, updatePrice, addCut, updateCut, applyBulkUpdate } = useDemoCuts()
  const [filters, setFilters] = useState<CutFilters>({
    search: '',
    category: '',
    status: 'active',
  })
  const [bulkOpen, setBulkOpen] = useState(false)
  const [cutForm, setCutForm] = useState<CutFormState>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const visibleCuts = useMemo(() => filterCuts(cuts, filters), [cuts, filters])
  const categories = useMemo(() => getCategories(cuts), [cuts])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  function handleSavePrice(id: string, newPrice: number) {
    const cut = cuts.find((item) => item.id === id)
    updatePrice(id, newPrice)
    if (cut) setNotice(`Precio de ${cut.name} actualizado a ${formatPesos(newPrice)}.`)
  }

  function handleSubmitCut(data: ValidCutData) {
    if (cutForm?.mode === 'edit') {
      updateCut(cutForm.cut.id, data)
      setNotice(`Corte «${data.name}» actualizado.`)
    } else {
      addCut(data)
      setNotice(`Corte «${data.name}» agregado.`)
    }
    setCutForm(null)
  }

  function handleBulkApply(changes: PriceChange[], summary: string) {
    applyBulkUpdate(changes)
    setBulkOpen(false)
    setNotice(
      `${summary}: ${changes.length} ${
        changes.length === 1 ? 'corte actualizado' : 'cortes actualizados'
      }.`,
    )
  }

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-4 pb-24">
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Datos de demostración:</strong> los cortes y precios son ficticios y se
          reinician al recargar la página.
        </p>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className={`${btnPrimary} py-4 text-lg`}
          >
            <RefreshCw size={22} aria-hidden="true" />
            Actualizar precios
          </button>
          <button
            type="button"
            onClick={() => setCutForm({ mode: 'create' })}
            className={`${btnSecondary} py-4 text-lg`}
          >
            <Plus size={22} aria-hidden="true" />
            Agregar corte
          </button>
        </div>

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