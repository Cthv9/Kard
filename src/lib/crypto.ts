const ALGORITHM = 'AES-GCM'
const IV_BYTES = 12
const ENC_PREFIX = 'enc1:'

export async function generateWalletKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: ALGORITHM, length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key)
  return uint8ToBase64(new Uint8Array(raw as ArrayBuffer))
}

export async function importKey(base64: string): Promise<CryptoKey> {
  const raw = base64ToUint8(base64)
  return crypto.subtle.importKey('raw', raw, ALGORITHM, true, ['encrypt', 'decrypt'])
}

export async function encryptField(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded)
  const buf = new Uint8Array(new ArrayBuffer(IV_BYTES + ciphertext.byteLength))
  buf.set(iv, 0)
  buf.set(new Uint8Array(ciphertext as ArrayBuffer), IV_BYTES)
  return ENC_PREFIX + uint8ToBase64(buf)
}

export async function decryptField(blob: string, key: CryptoKey): Promise<string> {
  const b64 = blob.startsWith(ENC_PREFIX) ? blob.slice(ENC_PREFIX.length) : blob
  const bytes = base64ToUint8(b64)
  // Use buffer views instead of .slice() to keep Uint8Array<ArrayBuffer> typing.
  const iv = new Uint8Array(bytes.buffer, 0, IV_BYTES)
  const ciphertext = new Uint8Array(bytes.buffer, IV_BYTES)
  const plaintext = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext)
  return new TextDecoder().decode(plaintext)
}

// A blob is encrypted when it starts with the known prefix.
export function isEncryptedBlob(value: string): boolean {
  return value.startsWith(ENC_PREFIX)
}

// Iteration count for new backup exports. OWASP 2023 recommends >= 600k for
// PBKDF2-HMAC-SHA256. Older backups carry their own iteration count in the
// payload, so increasing this here does not break import of existing files.
export const BACKUP_PBKDF2_ITERATIONS = 600_000

// Password-based key derivation for backup encryption.
export async function deriveBackupKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number = BACKUP_PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export function uint8ToBase64(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export function base64ToUint8(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const buf = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
