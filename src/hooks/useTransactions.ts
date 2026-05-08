import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import type { TransactionWithUser } from '../types/app'
import { ACTIVE_CARDS_KEY } from './useCards'

export const txKey = (cardId: string) => ['transactions', cardId] as const

export function useTransactions(cardId: string | null) {
  return useQuery({
    queryKey: txKey(cardId ?? ''),
    enabled: !!cardId,
    queryFn: async (): Promise<TransactionWithUser[]> => {
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('card_id', cardId!)
        .order('created_at', { ascending: false })
        .limit(50)
      if (txError) throw txError
      if (!txData.length) return []

      const userIds = [...new Set(txData.map((t) => t.user_id))]
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_color')
        .in('id', userIds)
      if (profileError) throw profileError

      const profileMap = new Map(profileData.map((p) => [p.id, p]))

      return txData.map((tx) => ({
        ...tx,
        profile: profileMap.get(tx.user_id) ?? {
          display_name: 'Utente',
          avatar_color: '#6366f1',
        },
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
      const { data, error } = await supabase.rpc('deduct_credit', {
        p_card_id: cardId,
        p_amount: amount,
        p_note: note,
      })
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ACTIVE_CARDS_KEY })
      qc.invalidateQueries({ queryKey: txKey(variables.cardId) })
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
