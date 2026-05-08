import { create } from 'zustand'

interface PrivacyStoreState {
  privacyMode: boolean
  togglePrivacy: () => void
  maskAmount: (amount: number, currency?: string) => string
}

export const usePrivacyStore = create<PrivacyStoreState>((set, get) => ({
  privacyMode: false,

  togglePrivacy: () => set((s) => ({ privacyMode: !s.privacyMode })),

  maskAmount: (amount, currency = 'EUR') => {
    if (get().privacyMode) return `${currency === 'EUR' ? '€' : currency} ••••`
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  },
}))
