import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import { withTimeout } from '../lib/utils'
import type { Transaction, TransactionWithUser } from '../types/app'
import { ACTIVE_CARDS_KEY } from './useCards'
import { STATS_KEY } from './useStats'

export const txKey = (cardId: string) => ['transactions', cardId] as const

// Shape returned by the JOIN query below. PostgREST embeds the related row
// under the alias we give it (`profile`) and the FK declared in
// database.ts → transactions.Relationships makes it a 1-1 (object, not array).
type TransactionRow = Transaction & {
  profile: { id: string; display_name: string; avatar_color: string } | null
}

const FALLBACK_PROFILE: TransactionWithUser['profile'] = {
  display_name: 'Utente',
  avatar_color: '#6366f1',
}

export function useTransactions(cardId: string | null) {
  const session = useAuthStore((s) => s.session)
  return useQuery({
    queryKey: txKey(cardId ?? ''),
    enabled: !!cardId && !!session,
    queryFn: async (): Promise<TransactionWithUser[]> => {
      // Single JOIN query instead of 2 sequential calls.
      // transactions.user_id → profiles.id FK is declared in Database types,
      // so PostgREST resolves the embed without runtime ambiguity.
      const { data, error } = await withTimeout(
        supabase
          .from('transactions')
          .select('*, profile:profiles!user_id(id, display_name, avatar_color)')
          .eq('card_id', cardId!)
          .order('created_at', { ascending: false })
          .limit(50)
          .returns<TransactionRow[]>()
      )
      if (error) throw error
      return (data ?? []).map((tx) => ({
        ...tx,
        profile: tx.profile ?? FALLBACK_PROFILE,
      }))
    },
  })
}

export function useDeductCredit() {
  const qc = useQueryClient()
  const profile = useAuthStore((s) => s.profile)

  return useMutation({
    mutationFn: async ({
      cardId,
      amount,
      note,
    }: {
      cardId: string
      amount: number
      note?: string
    }) => {
      if (!profile) throw new Error('Not authenticated')
      const { data, error } = await withTimeout(
        supabase.rpc('deduct_credit', {
          p_card_id: cardId,
          p_amount: amount,
          p_note: note,
        })
      )
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ACTIVE_CARDS_KEY })
      qc.invalidateQueries({ queryKey: txKey(variables.cardId) })
      qc.invalidateQueries({ queryKey: STATS_KEY })
    },
  })
}

export function useRealtimeTransactions(cardId: string | null) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!cardId) return

    const channel = supabase
      .channel(`tx-${cardId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `card_id=eq.${cardId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: txKey(cardId) })
          qc.invalidateQueries({ queryKey: ACTIVE_CARDS_KEY })
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [qc, cardId])
}
