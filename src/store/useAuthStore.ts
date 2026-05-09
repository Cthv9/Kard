import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '../types/app'

// Read user+profile from localStorage synchronously at module load time so
// we can initialize isLoading=false for returning users — zero spinner flash.
const _cached = (() => {
  try {
    const raw = localStorage.getItem('kard-auth')
    if (!raw) return null
    return (JSON.parse(raw) as { state: { user: User | null; profile: Profile | null } }).state
  } catch {
    return null
  }
})()

const hasCachedSession = Boolean(_cached?.user && _cached?.profile)

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

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      // Pre-populate from cache — onAuthStateChange validates in background
      user: _cached?.user ?? null,
      session: null,
      profile: _cached?.profile ?? null,
      // Skip the loading screen entirely for returning users with cached data
      isLoading: !hasCachedSession,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'kard-auth',
      // Persist only user identity and profile — never session tokens
      partialize: (s) => ({ user: s.user, profile: s.profile }),
    }
  )
)
