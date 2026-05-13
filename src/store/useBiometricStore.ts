import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BiometricState {
  isEnabled: boolean
  credentialId: string | null
  isLocked: boolean

  enable: (credentialId: string) => void
  disable: () => void
  setLocked: (locked: boolean) => void
}

export const useBiometricStore = create<BiometricState>()(
  persist(
    (set) => ({
      isEnabled: false,
      credentialId: null,
      isLocked: false,

      enable: (credentialId) => set({ isEnabled: true, credentialId, isLocked: false }),
      disable: () => set({ isEnabled: false, credentialId: null, isLocked: false }),
      setLocked: (isLocked) => set({ isLocked }),
    }),
    {
      name: 'kard-biometric',
      // isLocked is transient: we deliberately re-derive it on every hydration
      // so a cold boot of a biometric-enabled device starts LOCKED. Persisting
      // it would let a user kill the app and reopen it unlocked. The
      // visibility-based 30s lock in App.tsx still applies on subsequent
      // backgrounds.
      partialize: (s) => ({ isEnabled: s.isEnabled, credentialId: s.credentialId }),
      onRehydrateStorage: () => (state) => {
        if (state?.isEnabled) state.isLocked = true
      },
    }
  )
)
