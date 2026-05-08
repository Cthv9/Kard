import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import type { Card, CardInsert, CardUpdate, CardWithStats } from '../types/app'
import { isExpired, isLowBalance } from '../lib/utils'

export const CARDS_KEY = ['cards'] as const
export const ACTIVE_CARDS_KEY = [...CARDS_KEY, 'active'] as const
export const ARCHIVED_CARDS_KEY = [...CARDS_KEY, 'archived'] as const

function toCardWithStats(card: Card): CardWithStats {
  return {
    ...card,
    spent: card.initial_balance - card.current_balance,
    usedPercent:
      card.initial_balance > 0
        ? ((card.initial_balance - card.current_balance) / card.initial_balance) * 100
        : 0,
    isExpired: isExpired(card.expiry_date),
    isLow: isLowBalance(card.current_balance, card.initial_balance),
  }
}

async function fetchActiveCards() {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

async function fetchArchivedCards() {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('is_archived', true)
    .order('archived_at', { ascending: false })
  if (error) throw error
  return data
}

// ── ViewModels ────────────────────────────────────────────────────────────────

export function useActiveCards() {
  return useQuery({
    queryKey: ACTIVE_CARDS_KEY,
    queryFn: async () => {
      const data = await fetchActiveCards()
      return data.map(toCardWithStats)
    },
  })
}

export function useArchivedCards() {
  return useQuery({
    queryKey: ARCHIVED_CARDS_KEY,
    queryFn: async () => {
      const data = await fetchArchivedCards()
      return data.map(toCardWithStats)
    },
  })
}

export function useAddCard() {
  const qc = useQueryClient()
  const profile = useAuthStore((s) => s.profile)

  return useMutation({
    mutationFn: async (values: Omit<CardInsert, 'wallet_id' | 'created_by'>) => {
      if (!profile) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('cards')
        .insert({
          ...values,
          wallet_id: profile.wallet_id,
          created_by: profile.id,
          current_balance: values.initial_balance,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ACTIVE_CARDS_KEY }),
  })
}

export function useUpdateCard() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...update }: { id: string } & CardUpdate) => {
      const { error } = await supabase.from('cards').update(update).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTIVE_CARDS_KEY })
      qc.invalidateQueries({ queryKey: ARCHIVED_CARDS_KEY })
    },
  })
}

export function useArchiveCard() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cards')
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTIVE_CARDS_KEY })
      qc.invalidateQueries({ queryKey: ARCHIVED_CARDS_KEY })
    },
  })
}

export function useRestoreCard() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cards')
        .update({ is_archived: false, archived_at: null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTIVE_CARDS_KEY })
      qc.invalidateQueries({ queryKey: ARCHIVED_CARDS_KEY })
    },
  })
}

export function useDeleteCard() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cards').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CARDS_KEY })
    },
  })
}

// Real-time subscription — call once at app root level
export function useRealtimeCards() {
  const qc = useQueryClient()
  const profile = useAuthStore((s) => s.profile)

  useEffect(() => {
    if (!profile) return

    const channel = supabase
      .channel(`cards-${profile.wallet_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
          filter: `wallet_id=eq.${profile.wallet_id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: CARDS_KEY })
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [qc, profile])
}
