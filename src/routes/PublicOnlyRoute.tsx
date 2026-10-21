import { Navigate, Outlet, useLocation } from 'react-router'
import { FullScreenLoader } from '../components/ui/FullScreenLoader'
import { useAuth } from '../features/auth/useAuth'

function getRedirectTarget(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const from = (state as { from?: { pathname?: unknown } }).from
    const pathname = from?.pathname
    if (typeof pathname === 'string' && pathname.startsWith('/') && pathname !== '/login') {
      return pathname
    }
  }
  return '/'
}

/** Para el login: si ya hay sesión, redirige a donde el usuario quería ir. */
export function PublicOnlyRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenLoader />
  if (session) return <Navigate to={getRedirectTarget(location.state)} replace />
  return <Outlet />
}