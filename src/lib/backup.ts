import { supabase } from './supabase'
import { encryptField, decryptField, deriveBackupKey } from './crypto'
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
  // base64-encoded 16-byte salt used for PBKDF2 key derivation
  salt: string
  // base64-encoded 12-byte IV used for AES-GCM
  iv: string
  // AES-GCM ciphertext of the JSON-stringified CardBackupEntry[]
  data: string
}

export type KardBackup = KardBackupV1 | KardBackupV2

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
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

  const walletName = (walletData as { name: string } | null)?.name ?? 'Kard'
  const exportedAt = new Date().toISOString()

  const cardEntries: CardBackupEntry[] = cards.map((c) => ({
    name: c.name,
    description: c.description,
    code: c.code,
    code_type: c.code_type as 'barcode' | 'qrcode' | 'text',
    initial_balance: c.initial_balance,
    current_balance: c.current_balance,
    currency: c.currency,
    color: c.color,
    card_number: c.card_number,
    expiry_date: c.expiry_date,
    is_archived: c.is_archived,
    transactions: txByCard.get(c.id) ?? [],
  }))

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

  const errors: string[] = []
  const toInsert = cardEntries.map((c) => ({
    wallet_id: profile.wallet_id,
    created_by: profile.id,
    name: c.name,
    description: c.description ?? null,
    code: c.code,
    code_type: c.code_type,
    initial_balance: c.current_balance,
    current_balance: c.current_balance,
    currency: c.currency ?? 'EUR',
    color: c.color,
    card_number: c.card_number ?? null,
    expiry_date: c.expiry_date ?? null,
    is_archived: c.is_archived ?? false,
  }))

  const { data, error } = await supabase.from('cards').insert(toInsert).select('id')
  if (error) {
    errors.push(error.message)
    return { imported: 0, errors }
  }

  return { imported: data?.length ?? 0, errors }
}

// Re-encrypts a plaintext field value using the active wallet key.
// Used by the one-time migration of pre-encryption records.
export async function reencryptCardField(
  cardId: string,
  field: 'card_number' | 'expiry_date' | 'code',
  plaintext: string,
  key: CryptoKey
): Promise<void> {
  const encrypted = await encryptField(plaintext, key)
  await supabase.from('cards').update({ [field]: encrypted }).eq('id', cardId)
}

// Decrypts a previously-encrypted field value (used for backup display/export).
export { decryptField }
