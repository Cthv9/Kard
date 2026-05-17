import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { WalletStats } from '../types/app'
import { withTimeout } from '../lib/utils'
import { useAuthStore } from '../store/useAuthStore'

export const STATS_KEY = ['stats'] as const

// Server returns numeric columns as strings in JSON to preserve precision.
// We coerce here so the UI math (sums, percentages) stays in JS numbers.
interface RawWalletStats {
  totalRemaining: number | string
  totalInitial: number | string
  activeCardCount: number | string
  archivedCardCount: number | string
  userSpending: Array<{
    profile: { id: string; display_name: string; avatar_color: string }
    totalSpent: number | string
    transactionCount: number | string
  }>
}

function toNumber(v: number | string): number {
  return typeof v === 'number' ? v : Number(v)
}

export function useStats() {
  // Wait for Supabase to restore the session before firing — same race as
  // useActiveCards: without this the RPC fires with no auth on PWA restart
  // and PostgREST returns an empty stats blob.
  const session = useAuthStore((s) => s.session)
  return useQuery({
    queryKey: STATS_KEY,
    enabled: !!session,
    queryFn: async (): Promise<WalletStats> => {
      // Single round-trip; aggregation happens in Postgres (migration 008).
      // Old client-side path scanned up to 2000 transactions per refresh.
      const { data, error } = await withTimeout(supabase.rpc('wallet_stats'))
      if (error) throw error
      // The RPC returns `jsonb`, which Supabase types as Json. The shape is
      // contractually defined by migration 008 — we narrow here once instead
      // of teaching the inference engine the full nested structure.
      const raw = data as unknown as RawWalletStats
      return {
        totalRemaining: toNumber(raw.totalRemaining),
        totalInitial: toNumber(raw.totalInitial),
        activeCardCount: toNumber(raw.activeCardCount),
        archivedCardCount: toNumber(raw.archivedCardCount),
        userSpending: raw.userSpending.map((u) => ({
          profile: u.profile,
          totalSpent: toNumber(u.totalSpent),
          transactionCount: toNumber(u.transactionCount),
        })),
      }
    },
    staleTime: 1000 * 60 * 5,
  })
}
