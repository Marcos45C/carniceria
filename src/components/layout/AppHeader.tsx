import { Beef, LogOut } from 'lucide-react'

interface AppHeaderProps {
  /** Se mostrará cuando exista autenticación (Etapa 4). */
  email?: string
  onSignOut?: () => void
}

export function AppHeader({ email, onSignOut }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-brand-700 text-white shadow">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <Beef size={26} aria-hidden="true" />
          <h1 className="text-xl font-bold">Carnicería Pro</h1>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          {email && <span className="max-w-[10rem] truncate text-sm sm:max-w-xs">{email}</span>}
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-semibold hover:bg-brand-800"
            >
              <LogOut size={18} aria-hidden="true" />
              Salir
            </button>
          )}
        </div>
      </div>
    </header>
  )
}