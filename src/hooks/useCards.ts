import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import { useWalletKeyStore } from '../store/useWalletKeyStore'
import { encryptField, decryptField, importKey, isEncryptedBlob } from '../lib/crypto'
import { migrateExistingCards } from '../lib/migrateEncryption'
import type { Card, CardInsert, CardUpdate, CardWithStats } from '../types/app'
import { isExpired, isLowBalance } from '../lib/utils'

// Supabase requests can hang indefinitely on flaky mobile connections —
// surface a real error to the user instead of a permanent spinner.
function withTimeout<T>(promise: PromiseLike<T>, ms = 15_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Richiesta scaduta. Riprova.')), ms)
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) }
    )
  })
}

export const CARDS_KEY = ['cards'] as const
export const ACTIVE_CARDS_KEY = [...CARDS_KEY, 'active'] as const
export const ARCHIVED_CARDS_KEY = [...CARDS_KEY, 'archived'] as const

const ENCRYPTED_FIELDS = ['card_number', 'expiry_date', 'code'] as const

async function decryptCardFields(card: Card, key: CryptoKey): Promise<Card> {
  const result = { ...card }
  for (const field of ENCRYPTED_FIELDS) {
    const v = result[field as keyof Card]
    if (typeof v === 'string' && v.length > 0 && isEncryptedBlob(v)) {
      try {
        (result as Record<string, unknown>)[field] = await decryptField(v, key)
      } catch {
        // Decryption failure means wrong key or corrupted data — leave raw.
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

async function fetchActiveCards(key: CryptoKey | null) {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })
  if (error) throw error
  if (!key) return data
  return Promise.all(data.map((c) => decryptCardFields(c, key)))
}

async function fetchArchivedCards(key: CryptoKey | null) {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('is_archived', true)
    .order('archived_at', { ascending: false })
  if (error) throw error
  if (!key) return data
  return Promise.all(data.map((c) => decryptCardFields(c, key)))
}

// ── ViewModels ────────────────────────────────────────────────────────────────

export function useActiveCards() {
  return useQuery({
    queryKey: ACTIVE_CARDS_KEY,
    queryFn: async () => {
      const key = await getKey()
      const data = await fetchActiveCards(key)
      return data.map(toCardWithStats)
    },
  })
}

export function useArchivedCards() {
  return useQuery({
    queryKey: ARCHIVED_CARDS_KEY,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ACTIVE_CARDS_KEY }),
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

    // One-time migration: encrypt any legacy plaintext card fields.
    getKey().then((key) => {
      if (key) migrateExistingCards(profile.wallet_id, key).catch(() => {})
    })

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

    // Realtime can be silently dropped while the PWA is backgrounded, so on
    // return-to-foreground we always force a refetch — this is what catches
    // a card added on the web while the installed app was closed.
    const onVisible = () => {
      if (!document.hidden) qc.invalidateQueries({ queryKey: CARDS_KEY })
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      void supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [qc, profile])
}
