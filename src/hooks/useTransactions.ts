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
      // Single JOIN query instead of 2 sequential calls.
      // transactions.user_id → profiles.id FK enables this (migration 001).
      const { data, error } = await supabase
        .from('transactions')
        .select('*, profile:profiles!user_id(id, display_name, avatar_color)')
        .eq('card_id', cardId!)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []).map((tx) => ({
        ...tx,
        // The FK exists in the DB (migration 001) but isn't reflected in the
        // auto-generated TS types, so we cast through unknown.
        profile: (tx.profile as unknown as TransactionWithUser['profile'] | null) ?? {
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
