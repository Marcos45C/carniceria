import { Navigate, Outlet, useLocation } from 'react-router'
import { FullScreenLoader } from '../components/ui/FullScreenLoader'
import { useAuth } from '../features/auth/useAuth'

/** Solo deja pasar a usuarios con sesión; nunca muestra contenido privado antes. */
export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}