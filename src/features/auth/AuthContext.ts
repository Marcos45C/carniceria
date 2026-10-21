import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { SignInResult } from '../../types/auth'

export interface AuthContextValue {
  session: Session | null
  user: User | null
  /** true hasta que Supabase informa si hay una sesión guardada. */
  loading: boolean
  signIn: (email: string, password: string) => Promise<SignInResult>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)