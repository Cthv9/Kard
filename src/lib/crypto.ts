const ALGORITHM = 'AES-GCM'
const IV_BYTES = 12

export async function generateWalletKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: ALGORITHM, length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key)
  return uint8ToBase64(new Uint8Array(raw))
}

export async function importKey(base64: string): Promise<CryptoKey> {
  const raw = base64ToUint8(base64)
  return crypto.subtle.importKey('raw', raw, ALGORITHM, true, ['encrypt', 'decrypt'])
}

export async function encryptField(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded)
  const result = new Uint8Array(IV_BYTES + ciphertext.byteLength)
  result.set(iv, 0)
  result.set(new Uint8Array(ciphertext), IV_BYTES)
  return uint8ToBase64(result)
}

export async function decryptField(blob: string, key: CryptoKey): Promise<string> {
  const bytes = base64ToUint8(blob)
  const iv = bytes.slice(0, IV_BYTES)
  const ciphertext = bytes.slice(IV_BYTES)
  const plaintext = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext)
  return new TextDecoder().decode(plaintext)
}

// Detects whether a string looks like an AES-GCM blob (IV=12 bytes → min 16 bytes base64 ≥ 22 chars)
// A plaintext card_number / expiry / barcode code is always shorter or doesn't match base64 pattern.
export function isEncryptedBlob(value: string): boolean {
  if (value.length < 22) return false
  return /^[A-Za-z0-9+/]+=*$/.test(value)
}

export async function hashIp(ip: string): Promise<string> {
  const encoded = new TextEncoder().encode(`kard-ip-v1:${ip}`)
  const hash = await crypto.subtle.digest('SHA-256', encoded)
  return uint8ToBase64(new Uint8Array(hash))
}

// Password-based key derivation for backup encryption
export async function deriveBackupKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200_000, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

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
