import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import { useWalletKeyStore } from '../store/useWalletKeyStore'
import { useBiometricStore } from '../store/useBiometricStore'
import { usePrivacyStore } from '../store/usePrivacyStore'
import { useCardStore } from '../store/useCardStore'
import { queryClient } from '../lib/queryClient'

// Keys we own in localStorage. signOut() wipes all of them so the next user
// of the device cannot inherit the previous wallet's encryption key, cached
// queries, biometric credential, etc. `kard-settings` is kept so theme and
// language survive a logout — they hold no user data.
const SENSITIVE_LS_KEYS = [
  'kard-auth',
  'kard-query-cache',
  'kard-wallet-key',
  'kard-biometric',
  'kard-privacy',
  'kard-enc-migration-v1',
]

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
        // On a fresh sign-in without a cached profile, show the loading
        // screen instead of briefly rendering the OnboardingPage with the
        // old gradient while the profile fetches.
        if (event === 'SIGNED_IN' && !useAuthStore.getState().profile) {
          setLoading(true)
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
  // Race the network sign-out against a short timeout. supabase-js can hang
  // indefinitely inside a PWA when the server is unreachable, which would
  // leave the menu closed but the user still on the home page.
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 4_000)
  )
  try {
    await Promise.race([supabase.auth.signOut(), timeout])
  } catch {
    // Local sign-out always wins: it just wipes the session from storage.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
  }

  // Defensively wipe persisted client state. onAuthStateChange normally
  // handles this, but if the listener is delayed (timeout path above) the
  // UI would otherwise stay on the home screen until the next reload.
  try {
    for (const key of SENSITIVE_LS_KEYS) localStorage.removeItem(key)
    // Per-wallet flags (kard-enc-migration-v1:<wallet-id>) can't be enumerated
    // from a static list — sweep them by prefix.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key && key.startsWith('kard-enc-migration-v1:')) localStorage.removeItem(key)
    }
  } catch {
    // localStorage can throw in private/quota-exceeded contexts — ignore.
  }
  // Clear in-memory state of every store that holds wallet-scoped data, so a
  // re-login on the same tab cannot reuse the previous wallet's key or UI.
  useAuthStore.setState({ user: null, session: null, profile: null, isLoading: false })
  useWalletKeyStore.setState({ keyBase64: null })
  useBiometricStore.setState({ isEnabled: false, credentialId: null, isLocked: false })
  usePrivacyStore.setState({ privacyMode: false })
  useCardStore.setState({
    selectedCardId: null,
    isFocusMode: false,
    isSpendSheetOpen: false,
    isAddCardOpen: false,
    isScannerOpen: false,
    isSearchOpen: false,
    scannedCode: null,
    editingCard: null,
  })
  queryClient.clear()
}
