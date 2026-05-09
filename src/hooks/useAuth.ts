import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import { queryClient } from '../lib/queryClient'

export function useAuthInit() {
  const { setUser, setSession, setProfile, setLoading } = useAuthStore()
  const isFetchingProfile = useRef(false)

  useEffect(() => {
    // Cold-start safety net: if onAuthStateChange never fires (token refresh hanging
    // on slow/offline network), unblock the spinner after 10 s.
    const coldStartTimer = setTimeout(() => {
      console.log('[Auth] cold-start timer — forcing setLoading(false)')
      isFetchingProfile.current = false
      setLoading(false)
    }, 10_000)

    // Bug 3 fix: reset the dedup lock when the app becomes visible again.
    // On iOS, if JS was suspended while a fetch was in flight, isFetchingProfile
    // can stay true permanently. Resetting it here lets TOKEN_REFRESHED start
    // a fresh fetch on the next resume cycle.
    const handleVisibility = () => {
      if (!document.hidden) {
        console.log('[Auth] app resumed — resetting fetch lock')
        isFetchingProfile.current = false
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('[Auth] onAuthStateChange', { event: _event, hasSession: !!session, t: Date.now() })

        clearTimeout(coldStartTimer)

        // Bug 1 fix: per-event safety net. The cold-start timer is cleared above, so
        // we create a new one for EACH auth event. If loadProfile hangs (iOS TCP stuck),
        // this timer unblocks the spinner after 10 s from the last auth event.
        const eventTimer = setTimeout(() => {
          console.log('[Auth] per-event timer fired — forcing setLoading(false)')
          isFetchingProfile.current = false
          setLoading(false)
        }, 10_000)

        try {
          setSession(session)
          setUser(session?.user ?? null)
          if (session?.user) {
            const hasExistingProfile = useAuthStore.getState().profile !== null
            console.log('[Auth] hasExistingProfile:', hasExistingProfile)
            await loadProfile(session.user.id, !hasExistingProfile)
          } else {
            setProfile(null)
            setLoading(false)
            queryClient.clear()
          }
        } finally {
          clearTimeout(eventTimer)
        }
      }
    )

    return () => {
      clearTimeout(coldStartTimer)
      document.removeEventListener('visibilitychange', handleVisibility)
      subscription.unsubscribe()
    }
  }, [setUser, setSession, setProfile, setLoading])

  async function loadProfile(userId: string, showLoader = true) {
    if (isFetchingProfile.current) {
      console.log('[Auth] loadProfile: skipped (lock active)')
      return
    }
    isFetchingProfile.current = true
    if (showLoader) setLoading(true)
    console.log('[Auth] loadProfile: start', { userId, showLoader, t: Date.now() })

    // Bug 2 fix: use Promise.race with a timeout that RESOLVES (never rejects).
    // AbortController alone can't cancel a fetch whose Promise is stuck in a
    // half-open TCP state after iOS app suspension. Promise.race guarantees the
    // await always settles after 8 s, so the finally block is always reached.
    const controller = new AbortController()
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null

    const timeoutPromise = new Promise<{ data: null; error: null }>((resolve) => {
      timeoutHandle = setTimeout(() => {
        console.log('[Auth] loadProfile: 8 s timeout — aborting fetch')
        controller.abort()
        resolve({ data: null, error: null })
      }, 8000)
    })

    try {
      const result = await Promise.race([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .abortSignal(controller.signal)
          .single(),
        timeoutPromise,
      ])

      console.log('[Auth] loadProfile: settled', { hasData: !!result?.data, t: Date.now() })
      setProfile(result?.data ?? null)
    } catch {
      // Unexpected error — leave profile as-is so existing users don't get
      // bounced to OnboardingPage on a transient network error.
      console.log('[Auth] loadProfile: fetch error (profile unchanged)')
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle)
      isFetchingProfile.current = false
      setLoading(false)
      console.log('[Auth] loadProfile: done, setLoading(false)', { t: Date.now() })
    }
  }
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
  await supabase.auth.signOut()
}
