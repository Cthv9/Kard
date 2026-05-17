import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase, restGet } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import { useWalletKeyStore } from '../store/useWalletKeyStore'
import { encryptField, decryptField, importKey, isEncryptedBlob } from '../lib/crypto'
import { migrateExistingCards } from '../lib/migrateEncryption'
import type { Card, CardInsert, CardUpdate, CardWithStats } from '../types/app'
import { isExpired, isLowBalance, withTimeout } from '../lib/utils'
import { STATS_KEY } from './useStats'

export const CARDS_KEY = ['cards'] as const
export const ACTIVE_CARDS_KEY = [...CARDS_KEY, 'active'] as const
export const ARCHIVED_CARDS_KEY = [...CARDS_KEY, 'archived'] as const

const ENCRYPTED_FIELDS = ['card_number', 'expiry_date', 'code'] as const

type DecryptedCard = Card & { decryptionFailed: boolean }

async function decryptCardFields(card: Card, key: CryptoKey): Promise<DecryptedCard> {
  const result: DecryptedCard = { ...card, decryptionFailed: false }
  for (const field of ENCRYPTED_FIELDS) {
    const v = result[field as keyof Card]
    if (typeof v === 'string' && v.length > 0 && isEncryptedBlob(v)) {
      try {
        (result as Record<string, unknown>)[field] = await decryptField(v, key)
      } catch {
        // Wrong key or corrupted blob. Blank the field so we never hand the
        // raw ciphertext to JsBarcode / QRCode renderers and flag the card
        // so the UI can show a warning.
        (result as Record<string, unknown>)[field] = ''
        result.decryptionFailed = true
      }
    }
  }
  return result
}

async function getKey(): Promise<CryptoKey | null> {
  const { keyBase64 } = useWalletKeyStore.getState()
  if (!keyBase64) return null
  try {
    return await importKey(keyBase64)
  } catch {
    return null
  }
}

// Encrypt a single nullable string field when a key is available.
async function enc(value: string | null | undefined, key: CryptoKey | null): Promise<string | null | undefined> {
  if (key && typeof value === 'string' && value.length > 0) return encryptField(value, key)
  return value
}

function toCardWithStats(card: Card | DecryptedCard): CardWithStats {
  const decryptionFailed = 'decryptionFailed' in card ? card.decryptionFailed : false
  return {
    ...card,
    spent: card.initial_balance - card.current_balance,
    usedPercent:
      card.initial_balance > 0
        ? ((card.initial_balance - card.current_balance) / card.initial_balance) * 100
        : 0,
    isExpired: isExpired(card.expiry_date),
    isLow: isLowBalance(card.current_balance, card.initial_balance),
    decryptionFailed,
  }
}

async function fetchActiveCards(key: CryptoKey | null): Promise<(Card | DecryptedCard)[]> {
  const data = await restGet<Card[]>(
    'cards',
    'is_archived=eq.false&order=sort_order.asc&select=*',
    8_000
  )
  if (!key) return data
  return Promise.all(data.map((c) => decryptCardFields(c, key)))
}

async function fetchArchivedCards(key: CryptoKey | null): Promise<(Card | DecryptedCard)[]> {
  const data = await restGet<Card[]>(
    'cards',
    'is_archived=eq.true&order=archived_at.desc&select=*',
    8_000
  )
  if (!key) return data
  return Promise.all(data.map((c) => decryptCardFields(c, key)))
}

// ── ViewModels ────────────────────────────────────────────────────────────────

export function useActiveCards() {
  // Gate on user (always available from localStorage cache for returning users)
  // instead of session — combined with restGet() this lets data load immediately
  // without waiting for Supabase SDK's async initializePromise.
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ACTIVE_CARDS_KEY,
    enabled: !!user,
    queryFn: async () => {
      const key = await getKey()
      const data = await fetchActiveCards(key)
      return data.map(toCardWithStats)
    },
  })
}

export function useArchivedCards() {
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ARCHIVED_CARDS_KEY,
    enabled: !!user,
    queryFn: async () => {
      const key = await getKey()
      const data = await fetchArchivedCards(key)
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
      const key = await getKey()

      const { data, error } = await withTimeout(
        supabase
          .from('cards')
          .insert({
            ...values,
            code: (await enc(values.code, key)) ?? values.code,
            card_number: (await enc(values.card_number, key)) ?? null,
            expiry_date: (await enc(values.expiry_date, key)) ?? null,
            wallet_id: profile.wallet_id,
            created_by: profile.id,
            current_balance: values.initial_balance,
          })
          .select()
          .single()
      )
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTIVE_CARDS_KEY })
      qc.invalidateQueries({ queryKey: STATS_KEY })
    },
  })
}

export function useUpdateCard() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...update }: { id: string } & CardUpdate) => {
      const key = await getKey()
      const payload: CardUpdate = { ...update }
      if (key) {
        if (typeof payload.code === 'string') payload.code = await encryptField(payload.code, key)
        if (typeof payload.card_number === 'string') payload.card_number = await encryptField(payload.card_number, key)
        if (typeof payload.expiry_date === 'string') payload.expiry_date = await encryptField(payload.expiry_date, key)
      }
      const { error } = await withTimeout(
        supabase.from('cards').update(payload).eq('id', id)
      )
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTIVE_CARDS_KEY })
      qc.invalidateQueries({ queryKey: ARCHIVED_CARDS_KEY })
      qc.invalidateQueries({ queryKey: STATS_KEY })
    },
  })
}

export function useArchiveCard() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await withTimeout(
        supabase
          .from('cards')
          .update({ is_archived: true, archived_at: new Date().toISOString() })
          .eq('id', id)
      )
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTIVE_CARDS_KEY })
      qc.invalidateQueries({ queryKey: ARCHIVED_CARDS_KEY })
      qc.invalidateQueries({ queryKey: STATS_KEY })
    },
  })
}

export function useRestoreCard() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await withTimeout(
        supabase
          .from('cards')
          .update({ is_archived: false, archived_at: null })
          .eq('id', id)
      )
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTIVE_CARDS_KEY })
      qc.invalidateQueries({ queryKey: ARCHIVED_CARDS_KEY })
      qc.invalidateQueries({ queryKey: STATS_KEY })
    },
  })
}

export function useDeleteCard() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await withTimeout(
        supabase.from('cards').delete().eq('id', id)
      )
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CARDS_KEY })
      qc.invalidateQueries({ queryKey: STATS_KEY })
    },
  })
}

// Real-time subscription — call once at app root level
export function useRealtimeCards() {
  const qc = useQueryClient()
  const walletId = useAuthStore((s) => s.profile?.wallet_id ?? null)

  useEffect(() => {
    if (!walletId) return

    // One-time migration: encrypt any legacy plaintext card fields.
    // We swallow the rejection in production (the worst case is a re-run on
    // next mount), but we still surface it on the console so a developer
    // hitting this state can see the cause instead of a silent half-migrated
    // wallet.
    getKey().then((key) => {
      if (key) {
        migrateExistingCards(walletId, key).catch((err) => {
          console.error('[kard] migrateExistingCards failed:', err)
        })
      }
    })

    const channel = supabase
      .channel(`cards-${walletId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
          filter: `wallet_id=eq.${walletId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: CARDS_KEY })
          qc.invalidateQueries({ queryKey: STATS_KEY })
        }
      )
      .subscribe()

    // Realtime can be silently dropped while the PWA is backgrounded, so on
    // return-to-foreground we always force a refetch — this is what catches
    // a card added on the web while the installed app was closed.
    const onVisible = () => {
      if (!document.hidden) {
        qc.invalidateQueries({ queryKey: CARDS_KEY })
        qc.invalidateQueries({ queryKey: STATS_KEY })
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      void supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [qc, walletId])
}
