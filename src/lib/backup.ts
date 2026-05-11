import { supabase } from './supabase'
import {
  encryptField,
  decryptField,
  importKey,
  isEncryptedBlob,
  deriveBackupKey,
  uint8ToBase64,
  base64ToUint8,
} from './crypto'
import { useWalletKeyStore } from '../store/useWalletKeyStore'
import type { Profile } from '../types/app'

export interface TransactionBackupEntry {
  amount: number
  balance_after: number
  note: string | null
  created_at: string
}

export interface CardBackupEntry {
  name: string
  description: string | null
  code: string
  code_type: 'barcode' | 'qrcode' | 'text'
  initial_balance: number
  current_balance: number
  currency: string
  color: string
  card_number: string | null
  expiry_date: string | null
  is_archived: boolean
  transactions: TransactionBackupEntry[]
}

export interface KardBackupV1 {
  version: 1
  exportedAt: string
  walletName: string
  cards: CardBackupEntry[]
}

export interface KardBackupV2 {
  version: 2
  exportedAt: string
  walletName: string
  encrypted: true
  // base64-encoded 16-byte salt for PBKDF2 key derivation
  salt: string
  // base64-encoded 12-byte IV for AES-GCM
  iv: string
  // AES-GCM ciphertext of JSON-stringified CardBackupEntry[]
  data: string
}

export type KardBackup = KardBackupV1 | KardBackupV2

async function getWalletKey(): Promise<CryptoKey | null> {
  const { keyBase64 } = useWalletKeyStore.getState()
  if (!keyBase64) return null
  try {
    return await importKey(keyBase64)
  } catch {
    return null
  }
}

// Decrypt a nullable encrypted field; returns plaintext (or original value if
// it is not an encrypted blob, e.g. legacy wallet without encryption).
async function maybeDecrypt(value: string | null, key: CryptoKey | null): Promise<string | null> {
  if (!value || !key || !isEncryptedBlob(value)) return value
  try {
    return await decryptField(value, key)
  } catch {
    return value
  }
}

export async function exportBackup(profile: Profile, password?: string): Promise<void> {
  const walletId = profile.wallet_id

  const [walletRes, cardsRes] = await Promise.all([
    supabase.from('wallets').select('name').eq('id', walletId).single(),
    supabase.from('cards').select('*').eq('wallet_id', walletId).order('sort_order'),
  ])
  if (cardsRes.error) throw cardsRes.error

  const cards = cardsRes.data ?? []
  const cardIds = cards.map((c) => c.id)
  const txRes = cardIds.length
    ? await supabase
        .from('transactions')
        .select('card_id, amount, balance_after, note, created_at')
        .in('card_id', cardIds)
        .order('created_at')
    : { data: [], error: null as null | { message: string } }
  if (txRes.error) throw txRes.error
  const walletData = walletRes.data
  const transactions = txRes.data

  const txByCard = new Map<string, TransactionBackupEntry[]>()
  for (const tx of transactions ?? []) {
    const list = txByCard.get(tx.card_id) ?? []
    list.push({
      amount: tx.amount,
      balance_after: tx.balance_after,
      note: tx.note,
      created_at: tx.created_at,
    })
    txByCard.set(tx.card_id, list)
  }

  // Decrypt sensitive fields before writing to backup — the DB stores them as
  // encrypted blobs since the encryption migration ran.
  const wek = await getWalletKey()

  const walletName = (walletData as { name: string } | null)?.name ?? 'Kard'
  const exportedAt = new Date().toISOString()

  const cardEntries: CardBackupEntry[] = await Promise.all(
    cards.map(async (c) => ({
      name: c.name,
      description: c.description,
      code: await maybeDecrypt(c.code, wek) ?? c.code,
      code_type: c.code_type as 'barcode' | 'qrcode' | 'text',
      initial_balance: c.initial_balance,
      current_balance: c.current_balance,
      currency: c.currency,
      color: c.color,
      card_number: await maybeDecrypt(c.card_number, wek),
      expiry_date: await maybeDecrypt(c.expiry_date, wek),
      is_archived: c.is_archived,
      transactions: txByCard.get(c.id) ?? [],
    }))
  )

  let backup: KardBackup
  let filename: string

  if (password) {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const key = await deriveBackupKey(password, salt)
    const plaintext = new TextEncoder().encode(JSON.stringify(cardEntries))
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)

    backup = {
      version: 2,
      exportedAt,
      walletName,
      encrypted: true,
      salt: uint8ToBase64(salt),
      iv: uint8ToBase64(iv),
      data: uint8ToBase64(new Uint8Array(ciphertext)),
    }
    filename = `kard-backup-enc-${exportedAt.slice(0, 10)}.json`
  } else {
    backup = { version: 1, exportedAt, walletName, cards: cardEntries }
    filename = `kard-backup-${exportedAt.slice(0, 10)}.json`
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  await saveBlob(blob, filename)
}

async function saveBlob(blob: Blob, filename: string): Promise<void> {
  // In standalone PWAs (especially iOS) anchor-download silently fails — try
  // the Web Share API first when it can handle files.
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean
    share?: (data: { files: File[]; title?: string }) => Promise<void>
  }
  if (typeof nav.canShare === 'function' && typeof nav.share === 'function') {
    try {
      const file = new File([blob], filename, { type: blob.type })
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: filename })
        return
      }
    } catch (err) {
      // User cancelled the share sheet — treat as success, no fallback.
      if ((err as Error)?.name === 'AbortError') return
      // Otherwise fall through to anchor-download.
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.style.display = 'none'
  // The anchor MUST be in the DOM for the click to trigger a download in
  // Safari and most mobile browsers.
  document.body.appendChild(a)
  a.click()
  // Defer cleanup so the browser actually starts the download before the
  // blob URL is revoked.
  setTimeout(() => {
    a.remove()
    URL.revokeObjectURL(url)
  }, 1500)
}

export async function importBackup(
  file: File,
  profile: Profile,
  password?: string
): Promise<{ imported: number; errors: string[] }> {
  const text = await file.text()
  let backup: KardBackup

  try {
    backup = JSON.parse(text) as KardBackup
  } catch {
    throw new Error('invalid_json')
  }

  let cardEntries: CardBackupEntry[]

  if (backup.version === 2) {
    if (!password) throw new Error('password_required')
    const b2 = backup as KardBackupV2
    const salt = base64ToUint8(b2.salt)
    const iv = base64ToUint8(b2.iv)
    const ciphertext = base64ToUint8(b2.data)
    const key = await deriveBackupKey(password, salt)
    let plaintext: ArrayBuffer
    try {
      plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    } catch {
      throw new Error('wrong_password')
    }
    cardEntries = JSON.parse(new TextDecoder().decode(plaintext)) as CardBackupEntry[]
  } else if (backup.version === 1) {
    if (!Array.isArray(backup.cards)) throw new Error('invalid_format')
    cardEntries = backup.cards
  } else {
    throw new Error('invalid_format')
  }

  // Encrypt sensitive fields before inserting so the DB always gets ciphertext.
  const wek = await getWalletKey()

  const errors: string[] = []
  const toInsert = await Promise.all(
    cardEntries.map(async (c) => ({
      wallet_id: profile.wallet_id,
      created_by: profile.id,
      name: c.name,
      description: c.description ?? null,
      code: wek ? await encryptField(c.code, wek) : c.code,
      code_type: c.code_type,
      initial_balance: c.current_balance,
      current_balance: c.current_balance,
      currency: c.currency ?? 'EUR',
      color: c.color,
      card_number: c.card_number && wek ? await encryptField(c.card_number, wek) : c.card_number ?? null,
      expiry_date: c.expiry_date && wek ? await encryptField(c.expiry_date, wek) : c.expiry_date ?? null,
      is_archived: c.is_archived ?? false,
    }))
  )

  const { data, error } = await supabase.from('cards').insert(toInsert).select('id')
  if (error) {
    errors.push(error.message)
    return { imported: 0, errors }
  }

  return { imported: data?.length ?? 0, errors }
}
