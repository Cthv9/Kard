import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WalletKeyState {
  keyBase64: string | null
  setKey: (key: string | null) => void
}

export const useWalletKeyStore = create<WalletKeyState>()(
  persist(
    (set) => ({
      keyBase64: null,
      setKey: (keyBase64) => set({ keyBase64 }),
    }),
    { name: 'kard-wallet-key' }
  )
)
