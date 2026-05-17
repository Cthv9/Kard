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

// Read Supabase's own session from localStorage synchronously, using the same
// key formula as supabase-js (sb-{projectRef}-auth-token). Setting session here
// means queries are enabled on the very first render instead of waiting for the
// async INITIAL_SESSION event, eliminating the empty-card flash on PWA restart.
// We skip tokens within 3 min of expiry because Supabase will be running
// _recoverAndRefresh concurrently and we don't want to race with its lock.
function getStoredSupabaseSession(): Session | null {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
    if (!url) return null
    const projectRef = new URL(url).hostname.split('.')[0]
    const raw = localStorage.getItem(`sb-${projectRef}-auth-token`)
    if (!raw) return null
    const stored = JSON.parse(raw)
    if (!stored?.access_token || !stored?.expires_at) return null
    if ((stored.expires_at as number) * 1000 < Date.now() + 3 * 60 * 1000) return null
    return stored as Session
  } catch {
    return null
  }
}

const _storedSession = getStoredSupabaseSession()

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
      session: _storedSession,
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
