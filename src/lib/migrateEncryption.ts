import { supabase } from './supabase'
import { encryptField, isEncryptedBlob } from './crypto'

const FIELDS = ['card_number', 'expiry_date', 'code'] as const
type EncryptedField = typeof FIELDS[number]

// One-time migration: re-encrypts any card fields that still contain plaintext.
// Safe to call on every app start — encrypted blobs are detected and skipped.
export async function migrateExistingCards(walletId: string, key: CryptoKey): Promise<void> {
  const { data: cards, error } = await supabase
    .from('cards')
    .select('id, card_number, expiry_date, code')
    .eq('wallet_id', walletId)

  if (error || !cards) return

  for (const card of cards) {
    const patch: Partial<Record<EncryptedField, string>> = {}

    for (const field of FIELDS) {
      const value = card[field as keyof typeof card]
      if (typeof value === 'string' && value.length > 0 && !isEncryptedBlob(value)) {
        patch[field] = await encryptField(value, key)
      }
    }

    if (Object.keys(patch).length > 0) {
      await supabase.from('cards').update(patch).eq('id', card.id)
    }
  }
}
