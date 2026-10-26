import { useMemo, useState } from 'react'
import { AppHeader } from '../components/layout/AppHeader'
import { BatchesTab } from '../components/history/BatchesTab'
import { ChangesTab } from '../components/history/ChangesTab'
import { useAuth } from '../features/auth/useAuth'
import { useCuts } from '../features/cuts/useCuts'

type Tab = 'changes' | 'batches'

const TABS: { id: Tab; label: string }[] = [
  { id: 'changes', label: 'Cambios' },
  { id: 'batches', label: 'Actualizaciones masivas' },
]

export function HistoryPage() {
  const { user, signOut } = useAuth()
  const { cuts } = useCuts()
  const [tab, setTab] = useState<Tab>('changes')

  const cutNames = useMemo(() => new Map(cuts.map((cut) => [cut.id, cut.name])), [cuts])
  const currentUser = user ? { id: user.id, email: user.email } : null

  return (
    <div className="min-h-screen">
      <AppHeader
        email={user?.email}
        onSignOut={() => {
          void signOut()
        }}
      />

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-4 pb-24">
        <h2 className="text-2xl font-bold">Historial de precios</h2>

        <div
          role="tablist"
          aria-label="Vistas del historial"
          className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 sm:inline-grid"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`min-h-11 rounded-md px-4 text-sm font-semibold ${
                tab === item.id ? 'bg-white text-brand-800 shadow-sm' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'changes' ? (
          <ChangesTab cuts={cuts} cutNames={cutNames} currentUser={currentUser} />
        ) : (
          <BatchesTab cutNames={cutNames} currentUser={currentUser} />
        )}
      </main>
    </div>
  )
}