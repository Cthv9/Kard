import { supabase } from './supabase'
import { encryptField, isEncryptedBlob } from './crypto'

const FIELDS = ['card_number', 'expiry_date', 'code'] as const
type EncryptedField = typeof FIELDS[number]

// The legacy device-wide flag (`kard-enc-migration-v1`) prevented a second
// wallet on the same device from ever running the migration. We now key the
// flag per wallet so each wallet's encryption status is tracked independently.
const MIGRATION_FLAG_PREFIX = 'kard-enc-migration-v1:'
const LEGACY_MIGRATION_FLAG = 'kard-enc-migration-v1'

function flagKey(walletId: string): string {
  return `${MIGRATION_FLAG_PREFIX}${walletId}`
}

function isMigrationDone(walletId: string): boolean {
  try {
    if (localStorage.getItem(flagKey(walletId)) === 'done') return true
    // One-time honoring of the legacy global flag: if the device already
    // marked migration done in v1, treat the currently active wallet as
    // done and migrate the value to the per-wallet key. Other wallets on
    // the same device will still run their own migration on first open.
    if (localStorage.getItem(LEGACY_MIGRATION_FLAG) === 'done') {
      markMigrationDone(walletId)
      return true
    }
    return false
  } catch {
    return false
  }
}

function markMigrationDone(walletId: string): void {
  try {
    localStorage.setItem(flagKey(walletId), 'done')
  } catch {
    // localStorage unavailable — silently continue, migration will re-run next time.
  }
}

// One-time migration: re-encrypts any card fields that still contain plaintext.
// Skips subsequent runs via a per-wallet localStorage flag.
export async function migrateExistingCards(walletId: string, key: CryptoKey): Promise<void> {
  if (isMigrationDone(walletId)) return

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

  // Mark done whether or not anything was patched — if nothing needed encrypting
  // the wallet was already clean and there is no reason to re-scan next time.
  markMigrationDone(walletId)
}
