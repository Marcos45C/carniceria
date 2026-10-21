import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue } from './AuthContext'
import {
  signInWithPassword,
  signOut,
  subscribeToSession,
} from './authService'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // El primer aviso (INITIAL_SESSION) llega con la sesión guardada, si existe.
    return subscribeToSession((nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn: signInWithPassword,
      signOut,
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}