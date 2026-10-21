import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, RefreshCw } from 'lucide-react'
import { AppHeader } from '../components/layout/AppHeader'
import { CutsToolbar } from '../components/cuts/CutsToolbar'
import { CutsList } from '../components/cuts/CutsList'
import { CutFormModal } from '../components/cuts/CutFormModal'
import { btnPrimary, btnSecondary } from '../components/ui/styles'
import { useAuth } from '../features/auth/useAuth'
import { filterCuts, getCategories, type ValidCutData } from '../features/cuts/cutRules'
import { useCuts } from '../features/cuts/useCuts'
import type { Cut, CutFilters } from '../types/cut'
import type { Result } from '../types/result'
import { formatPesos } from '../utils/format'

type CutFormState = { mode: 'create' } | { mode: 'edit'; cut: Cut } | null

export function DashboardPage() {
  const { user, signOut } = useAuth()
  const { cuts, status, loadError, retry, savePrice, addCut, updateCut } = useCuts()
  const [filters, setFilters] = useState<CutFilters>({
    search: '',
    category: '',
    status: 'active',
  })
  const [cutForm, setCutForm] = useState<CutFormState>(null)
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
            disabled
            title="Disponible próximamente"
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
        <p className="-mt-2 text-sm text-gray-600">
          La actualización masiva de precios se activa en la próxima etapa.
        </p>

        {status === 'loading' && (
          <div
            role="status"
            className="flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white p-8 text-gray-700"
          >
            <Loader2 className="animate-spin" size={22} aria-hidden="true" />
            Cargando cortes…
          </div>
        )}

        {status === 'error' && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="font-semibold text-error-600">No se pudieron cargar los cortes.</p>
            {loadError && <p className="mt-1 text-sm text-gray-700">{loadError}</p>}
            <button
              type="button"
              onClick={() => {
                void retry()
              }}
              className={`${btnSecondary} mt-3`}
            >
              Reintentar
            </button>
          </div>
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