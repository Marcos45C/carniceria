import { Beef } from 'lucide-react'

export default function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6">
      <div className="rounded-full bg-brand-100 p-4 text-brand-700">
        <Beef size={40} aria-hidden="true" />
      </div>
      <h1 className="text-3xl font-bold text-brand-700">Carnicería Pro</h1>
      <p className="text-center text-gray-600">
        Entorno listo. Próximamente: gestión de precios.
      </p>
      <button
        type="button"
        className="w-full rounded-lg bg-brand-700 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
      >
        Botón de prueba
      </button>
    </main>
  )
}