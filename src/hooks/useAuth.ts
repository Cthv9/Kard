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

    // TOKEN_REFRESHED can fire BEFORE INITIAL_SESSION when the token
    // is refreshed during Supabase's own _initialize() flow. If we call
    // setSession() at that point, card queries become enabled and
    // immediately call auth.getSession() — which blocks on
    // initializePromise (still pending). On a slow Android connection the
    // 15-second withTimeout fires before init completes, the Supabase
    // fetch falls back to the anon key, RLS returns [], and cards appear
    // empty. Deferring setSession until INITIAL_SESSION (which fires only
    // after initializePromise resolves) eliminates the race entirely.
    let initialSessionEmitted = false

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip TOKEN_REFRESHED events that arrive before INITIAL_SESSION so
      // card queries never fire while initializePromise is still pending.
      if (event === 'TOKEN_REFRESHED' && !initialSessionEmitted) {
        return
      }

      setSession(session)
      setUser(session?.user ?? null)

      if (event === 'INITIAL_SESSION') {
        initialSessionEmitted = true
      }

      if (session?.user) {
        // After initialization, TOKEN_REFRESHED means the access token
        // rotated mid-session. Invalidate wallet-scoped queries so they
        // refetch with the new token.
        if (event === 'TOKEN_REFRESHED') {
          queryClient.invalidateQueries({ queryKey: ['cards'] })
          queryClient.invalidateQueries({ queryKey: ['stats'] })
          queryClient.invalidateQueries({ queryKey: ['transactions'] })
        }
        // On INITIAL_SESSION, always invalidate too — covers the edge case
        // where a query somehow ran before auth was stable and got [] back.
        if (event === 'INITIAL_SESSION') {
          queryClient.invalidateQueries({ queryKey: ['cards'] })
          queryClient.invalidateQueries({ queryKey: ['stats'] })
          queryClient.invalidateQueries({ queryKey: ['transactions'] })
        }
        // TOKEN_REFRESHED / INITIAL_SESSION with cached profile: skip the
        // profile network round-trip — there's nothing to change.
        if (
          (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') &&
          useAuthStore.getState().profile
        ) {
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
  // Synchronously clear the AES wallet key and any wallet-scoped UI state
  // BEFORE awaiting the network sign-out. Any query that fires in the race
  // window must not be able to decrypt new cards. Setting these here also
  // makes the post-network reset purely idempotent.
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

  // Race the network sign-out against a short timeout. supabase-js can hang
  // indefinitely inside a PWA when the server is unreachable, which would
  // leave the menu closed but the user still on the home page.
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 4_000)
  )
  try {
    try {
      await Promise.race([supabase.auth.signOut(), timeout])
    } catch {
      // Local sign-out always wins: it just wipes the session from storage.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    }
  } finally {
    // The final reset must run even if an unexpected throw escapes the inner
    // try — otherwise the UI would be stranded with a stale auth header.
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
    useAuthStore.setState({ user: null, session: null, profile: null, isLoading: false })
    useWalletKeyStore.setState({ keyBase64: null })
    useBiometricStore.setState({ isEnabled: false, credentialId: null, isLocked: false })
    usePrivacyStore.setState({ privacyMode: false })
    queryClient.clear()
  }
}
