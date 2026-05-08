import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { WalletStats } from '../types/app'

export const STATS_KEY = ['stats'] as const

export function useStats() {
  return useQuery({
    queryKey: STATS_KEY,
    queryFn: async (): Promise<WalletStats> => {
      const [cardsResult, txResult, profilesResult] = await Promise.all([
        supabase.from('cards').select('id, initial_balance, current_balance, is_archived'),
        supabase.from('transactions').select('user_id, amount'),
        supabase.from('profiles').select('*'),
      ])

      if (cardsResult.error) throw cardsResult.error
      if (txResult.error) throw txResult.error
      if (profilesResult.error) throw profilesResult.error

      const cards = cardsResult.data
      const transactions = txResult.data
      const profiles = profilesResult.data

      const active = cards.filter((c) => !c.is_archived)

      const totalRemaining = active.reduce((sum, c) => sum + c.current_balance, 0)
      const totalInitial = active.reduce((sum, c) => sum + c.initial_balance, 0)

      const spendMap = new Map<string, number>()
      const countMap = new Map<string, number>()
      for (const tx of transactions) {
        spendMap.set(tx.user_id, (spendMap.get(tx.user_id) ?? 0) + tx.amount)
        countMap.set(tx.user_id, (countMap.get(tx.user_id) ?? 0) + 1)
      }

      const userSpending = profiles.map((p) => ({
        profile: p,
        totalSpent: spendMap.get(p.id) ?? 0,
        transactionCount: countMap.get(p.id) ?? 0,
      }))

      return {
        totalRemaining,
        totalInitial,
        activeCardCount: active.length,
        archivedCardCount: cards.filter((c) => c.is_archived).length,
        userSpending,
      }
    },
    staleTime: 1000 * 60,
  })
}
