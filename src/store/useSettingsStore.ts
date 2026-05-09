import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light' | 'system'
export type Language = 'it' | 'en'

interface SettingsState {
  theme: Theme
  language: Language
  setTheme: (t: Theme) => void
  setLanguage: (l: Language) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'it',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    { name: 'kard-settings' }
  )
)
