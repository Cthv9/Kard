import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BiometricState {
  isEnabled: boolean
  credentialId: string | null
  userEmail: string | null
  isLocked: boolean

  enable: (credentialId: string, email: string) => void
  disable: () => void
  setLocked: (locked: boolean) => void
}

export const useBiometricStore = create<BiometricState>()(
  persist(
    (set) => ({
      isEnabled: false,
      credentialId: null,
      userEmail: null,
      isLocked: false,

      enable: (credentialId, userEmail) => set({ isEnabled: true, credentialId, userEmail }),
      disable: () => set({ isEnabled: false, credentialId: null, userEmail: null }),
      setLocked: (isLocked) => set({ isLocked }),
    }),
    {
      name: 'kard-biometric',
      // isLocked è transiente — non viene persistito tra sessioni
      partialize: (s) => ({ isEnabled: s.isEnabled, credentialId: s.credentialId, userEmail: s.userEmail }),
    }
  )
)
