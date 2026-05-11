import { supabase } from './supabase'
import { encryptField, isEncryptedBlob } from './crypto'

const FIELDS = ['card_number', 'expiry_date', 'code'] as const
type EncryptedField = typeof FIELDS[number]

const MIGRATION_FLAG = 'kard-enc-migration-v1'

function isMigrationDone(): boolean {
  try {
    return localStorage.getItem(MIGRATION_FLAG) === 'done'
  } catch {
    return false
  }
}

function markMigrationDone(): void {
  try {
    localStorage.setItem(MIGRATION_FLAG, 'done')
  } catch {
    // localStorage unavailable — silently continue, migration will re-run next time.
  }
}

// One-time migration: re-encrypts any card fields that still contain plaintext.
// Skips subsequent runs via a localStorage flag.
export async function migrateExistingCards(walletId: string, key: CryptoKey): Promise<void> {
  if (isMigrationDone()) return

  const { data: cards, error } = await supabase
    .from('cards')
    .select('id, card_number, expiry_date, code')
    .eq('wallet_id', walletId)

  if (error || !cards) return

  let anyPatched = false

  for (const card of cards) {
    const patch: Partial<Record<EncryptedField, string>> = {}

    for (const field of FIELDS) {
      const value = card[field as keyof typeof card]
      if (typeof value === 'string' && value.length > 0 && !isEncryptedBlob(value)) {
        patch[field] = await encryptField(value, key)
        anyPatched = true
      }
    }

    if (Object.keys(patch).length > 0) {
      await supabase.from('cards').update(patch).eq('id', card.id)
    }
  }

  // Mark done whether or not anything was patched — if nothing needed encrypting
  // the wallet was already clean and there is no reason to re-scan next time.
  void anyPatched
  markMigrationDone()
}
