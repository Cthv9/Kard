import { useQuery } from '@tanstack/react-query'
import { restRpc } from '../lib/supabase'
import type { WalletStats } from '../types/app'
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
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: STATS_KEY,
    enabled: !!user,
    queryFn: async (): Promise<WalletStats> => {
      // Single round-trip; aggregation happens in Postgres (migration 008).
      // Uses restRpc to bypass initializePromise and start immediately.
      const raw = await restRpc<RawWalletStats>('wallet_stats')
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
