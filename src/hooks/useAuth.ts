import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import { queryClient } from '../lib/queryClient'

export function useAuthInit() {
  const { setUser, setSession, setProfile, setLoading } = useAuthStore()
  // Prevent concurrent loadProfile calls (INITIAL_SESSION + TOKEN_REFRESHED fire together on resume)
  const isFetchingProfile = useRef(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await loadProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
          queryClient.clear()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [setUser, setSession, setProfile, setLoading])

  async function loadProfile(userId: string) {
    if (isFetchingProfile.current) return   // already in flight — skip
    isFetchingProfile.current = true
    setLoading(true)

    // Hard timeout: if the network hangs (common on mobile app-resume),
    // abort after 8 s so the spinner doesn't spin forever.
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .single()
      setProfile(data ?? null)
    } catch {
      // Aborted or unexpected error — leave profile as-is so existing users
      // don't get bounced to OnboardingPage on a bad network moment.
    } finally {
      clearTimeout(timeoutId)
      isFetchingProfile.current = false
      setLoading(false)
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
