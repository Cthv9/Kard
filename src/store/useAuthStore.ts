import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '../types/app'

interface AuthStoreState {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean

  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
}))
