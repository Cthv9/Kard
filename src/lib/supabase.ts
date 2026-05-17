import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { useAuthStore } from '../store/useAuthStore'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Only create the client when credentials are present — supabase-js v2 validates
// the anon key as a JWT at init time and throws if it's not valid.
export const supabase = isConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    })
  : (null as unknown as ReturnType<typeof createClient<Database>>)

export const SUPABASE_URL = supabaseUrl ?? ''
export const SUPABASE_ANON_KEY = supabaseAnonKey ?? ''

// ---------------------------------------------------------------------------
// Direct REST helpers — bypass supabase-js's internal initializePromise so
// data fetches start immediately without waiting for the SDK's async auth
// initialization (which can take 5-20 s on slow mobile networks).
//
// Token strategy:
//   1. Read the cached access_token from useAuthStore (synchronous, zero cost).
//   2. If missing, call supabase.auth.getSession() — may wait on the SDK's
//      initializePromise, but this only happens when there is truly no cached
//      session (e.g. first login after clearing app data).
//   3. On 401 (token expired between cache-read and request): call
//      refreshSession() once and retry.
// ---------------------------------------------------------------------------

async function getToken(): Promise<string> {
  const cached = useAuthStore.getState().session?.access_token
  if (cached) return cached
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Non autenticato')
  return session.access_token
}

function buildHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

async function execFetch(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function withTokenRetry<T>(
  buildInit: (token: string) => RequestInit,
  url: string,
  timeoutMs: number
): Promise<T> {
  let token = await getToken()
  let resp = await execFetch(url, buildInit(token), timeoutMs)

  if (resp.status === 401) {
    // Token expired — ask Supabase SDK to refresh (one network round-trip) then retry.
    const { data: { session } } = await supabase.auth.refreshSession()
    token = session?.access_token ?? ''
    if (!token) throw new Error('Sessione scaduta. Effettua di nuovo il login.')
    resp = await execFetch(url, buildInit(token), timeoutMs)
  }

  if (!resp.ok) {
    let msg = `Errore ${resp.status}`
    try { msg = ((await resp.json()) as { message?: string }).message ?? msg } catch { /* noop */ }
    throw new Error(msg)
  }

  return resp.json() as Promise<T>
}

/**
 * GET /rest/v1/{table}?{queryString}
 *
 * Direct PostgREST call that bypasses the SDK's initializePromise.
 * Use this for all read queries that run automatically on mount/resume.
 */
export function restGet<T>(table: string, queryString: string, timeoutMs = 8_000): Promise<T> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${queryString}`
  return withTokenRetry<T>((token) => ({ method: 'GET', headers: buildHeaders(token) }), url, timeoutMs)
}

/**
 * POST /rest/v1/rpc/{fnName}
 *
 * Direct RPC call that bypasses the SDK's initializePromise.
 */
export function restRpc<T>(fnName: string, body: Record<string, unknown> = {}, timeoutMs = 8_000): Promise<T> {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${fnName}`
  return withTokenRetry<T>(
    (token) => ({ method: 'POST', headers: buildHeaders(token), body: JSON.stringify(body) }),
    url,
    timeoutMs
  )
}
