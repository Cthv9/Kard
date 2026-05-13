import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'
import { it } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Supabase requests can hang indefinitely on flaky mobile connections —
// surface a real error to the user instead of a permanent spinner. The
// timeout is intentionally generous so plain slow networks don't trigger
// false positives.
export function withTimeout<T>(promise: PromiseLike<T>, ms = 15_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Richiesta scaduta. Riprova.')), ms)
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) }
    )
  })
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return format(new Date(dateString), 'dd MMM yyyy, HH:mm', { locale: it })
}

export function timeAgo(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: it })
}

export function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false
  return new Date(expiryDate) < new Date()
}

export function isLowBalance(current: number, initial: number): boolean {
  if (initial === 0) return false
  return current / initial < 0.2
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

export function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex)
  if (!rgb) return false
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.5
}

// Return up to two uppercase initials, falling back to '?' when the input is
// empty/whitespace. Handles the empty-string edge case that `?? '?'` would
// otherwise miss (empty string isn't nullish, so the fallback wouldn't fire).
export function initialsOf(displayName: string | null | undefined): string {
  if (!displayName) return '?'
  const parts = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.join('').toUpperCase().slice(0, 2)
}

// Return a darker shade of a 6-digit hex color. Falls back to the indigo
// brand color when the input is malformed (e.g. legacy 'rgb(…)' values that
// survived an unencrypted-to-encrypted migration).
const FALLBACK_HEX = '#6366f1'
export function darken(hex: string, amount = 0.35): string {
  const rgb = hexToRgb(hex) ?? hexToRgb(FALLBACK_HEX)!
  const r = Math.max(0, Math.round(rgb.r * (1 - amount)))
  const g = Math.max(0, Math.round(rgb.g * (1 - amount)))
  const b = Math.max(0, Math.round(rgb.b * (1 - amount)))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
