import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import type { URLOpenListenerEvent } from '@capacitor/app'
import { supabase } from './supabase'

/**
 * Handles an incoming com.kard.app://callback URL from Supabase OAuth.
 * Supports both implicit flow (hash fragment) and PKCE (query param `code`).
 * Returns true if a session was successfully established.
 */
export async function handleOAuthCallback(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'com.kard.app:') return false

    const raw = parsed.hash ? parsed.hash.slice(1) : parsed.search.slice(1)
    const params = new URLSearchParams(raw)

    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const code = params.get('code')

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      return !error
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      return !error
    }

    return false
  } catch {
    return false
  }
}

/**
 * Registers the Capacitor appUrlOpen listener for deep link handling.
 * No-op on web — safe to call unconditionally.
 * Returns a cleanup function to remove the listener on unmount.
 */
export function setupDeepLinks(): (() => void) | void {
  if (!Capacitor.isNativePlatform()) return

  let handle: { remove: () => void } | null = null

  App.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
    await handleOAuthCallback(event.url)
  }).then((h) => {
    handle = h
  })

  return () => {
    handle?.remove()
  }
}
