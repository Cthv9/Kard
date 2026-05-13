import { useCallback } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PrivacyStoreState {
  privacyMode: boolean
  togglePrivacy: () => void
}

export const usePrivacyStore = create<PrivacyStoreState>()(
  persist(
    (set) => ({
      privacyMode: false,
      togglePrivacy: () => set((s) => ({ privacyMode: !s.privacyMode })),
    }),
    { name: 'kard-privacy' }
  )
)

// Previously `maskAmount` lived on the store, which forced any component that
// destructured the whole store to re-render on every unrelated state change.
// Exposing it as a hook lets each caller subscribe specifically to privacyMode
// and reuse the same memoized function reference.
export function useMaskAmount(): (amount: number, currency?: string) => string {
  const privacyMode = usePrivacyStore((s) => s.privacyMode)
  return useCallback(
    (amount: number, currency = 'EUR') => {
      if (privacyMode) return `${currency === 'EUR' ? '€' : currency} ••••`
      return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
      }).format(amount)
    },
    [privacyMode]
  )
}
