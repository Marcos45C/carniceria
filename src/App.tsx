import { AuthProvider } from './features/auth/AuthProvider'
import { AppRoutes } from './routes/AppRoutes'

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}