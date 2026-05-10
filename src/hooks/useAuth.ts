import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import { queryClient } from '../lib/queryClient'

export function useAuthInit() {
  const { setUser, setSession, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    // Called once to unblock the initial loading screen.
    // Safe to call multiple times — idempotent after first call.
    const unlock = () => {
      if (useAuthStore.getState().isLoading) setLoading(false)
    }

    // Hard cap: never spin longer than 8s regardless of network state.
    const safetyTimer = setTimeout(unlock, 8_000)

    // Track which user's profile fetch is the most recent so stale results
    // from a previous (aborted) fetch don't overwrite newer data.
    let latestUserId: string | null = null

    async function loadProfile(userId: string) {
      latestUserId = userId
      const myId = userId

      const controller = new AbortController()
      const requestTimer = setTimeout(() => controller.abort(), 6_000)

      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', myId)
          .abortSignal(controller.signal)
          .single()

        if (myId === latestUserId) {
          setProfile(data ?? null)
        }
      } catch {
        // Network/abort error — keep whatever profile is already in the store.
      } finally {
        clearTimeout(requestTimer)
        unlock()
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        // TOKEN_REFRESHED means only the auth token changed — the profile
        // data hasn't changed, so skip the network round-trip if we already
        // have a profile. This eliminates any perceived delay on resume.
        if (event === 'TOKEN_REFRESHED' && useAuthStore.getState().profile) {
          unlock()
          return
        }
        await loadProfile(session.user.id)
      } else {
        setProfile(null)
        queryClient.clear()
        unlock()
      }
    })

    return () => {
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [setUser, setSession, setProfile, setLoading])
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signUp(email: string, password: string) {
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
}

export async function signOut() {
  // Try a normal (global) sign-out first. If the network call fails or hangs,
  // fall back to clearing the local session so the user actually gets logged
  // out instead of being stuck on the home page.
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch {
    await supabase.auth.signOut({ scope: 'local' })
  }
}
