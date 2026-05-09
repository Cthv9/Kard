import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import { queryClient } from '../lib/queryClient'

export function useAuthInit() {
  const { setUser, setSession, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION immediately, so no need for getSession()
    // Using both caused a race condition where two loadProfile calls ran simultaneously,
    // leaving isLoading stuck on true if the second fetch was slow
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
    setLoading(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setProfile(data ?? null)
    } finally {
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
