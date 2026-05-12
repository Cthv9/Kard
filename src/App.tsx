import { useLayoutEffect, useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { Toaster } from 'sonner'
import { queryClient } from './lib/queryClient'
import { isConfigured } from './lib/supabase'

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'kard-query-cache',
  throttleTime: 1000,
})

// Queries that contain wallet-scoped data are decrypted in memory but must
// never reach localStorage — persisting them would defeat the at-rest
// encryption against an attacker with local access (XSS, malware, shared
// device). Only the stats aggregate (no PAN, no codes, no notes) is allowed.
const PERSISTABLE_QUERY_KEYS = new Set<string>(['stats'])
const persistOptions = {
  persister,
  maxAge: 1000 * 60 * 60 * 24,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { queryKey: readonly unknown[] }) => {
      const root = query.queryKey[0]
      return typeof root === 'string' && PERSISTABLE_QUERY_KEYS.has(root)
    },
  },
}
import { useAuthStore } from './store/useAuthStore'
import { useSettingsStore } from './store/useSettingsStore'
import { useAuthInit } from './hooks/useAuth'
import { AuthPage } from './components/auth/AuthPage'
import { OnboardingPage } from './components/auth/OnboardingPage'
import { BiometricLockScreen } from './components/auth/BiometricLockScreen'
import { useBiometricStore } from './store/useBiometricStore'
import { useCardStore } from './store/useCardStore'
import { BottomNav } from './components/layout/BottomNav'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { SearchModal } from './components/cards/SearchModal'
import { HomePage } from './pages/HomePage'
import { StatsPage } from './pages/StatsPage'
import { ArchivePage } from './pages/ArchivePage'
import { SettingsPage } from './pages/SettingsPage'

function ThemeBootstrap() {
  const theme = useSettingsStore((s) => s.theme)

  // useLayoutEffect fires synchronously before paint → no flash of wrong theme
  useLayoutEffect(() => {
    const html = document.documentElement
    const apply = (isDark: boolean) => html.classList.toggle('light', !isDark)

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      apply(mq.matches)
      const handler = (e: MediaQueryListEvent) => apply(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    } else {
      apply(theme === 'dark')
    }
  }, [theme])

  return null
}

function AppRoutes() {
  useAuthInit()
  const { user, profile, isLoading } = useAuthStore()
  const { isEnabled: biometricEnabled, isLocked, setLocked } = useBiometricStore()
  const isSearchOpen = useCardStore((s) => s.isSearchOpen)

  // Blocca automaticamente dopo 30s in background se il biometrico è attivato
  useEffect(() => {
    if (!biometricEnabled || !user) return
    let hiddenAt: number | null = null
    const LOCK_AFTER = 30_000

    const handleVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now()
      } else if (hiddenAt !== null) {
        if (Date.now() - hiddenAt >= LOCK_AFTER) setLocked(true)
        hiddenAt = null
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [biometricEnabled, user, setLocked])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <div
            className="w-14 h-14 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: 'var(--accent2)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Caricamento...</p>
        </div>
      </div>
    )
  }

  if (biometricEnabled && isLocked && user) return <BiometricLockScreen />

  if (!user) return <AuthPage />
  if (!profile) return <OnboardingPage />

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <BottomNav />
      {isSearchOpen && <SearchModal />}
    </>
  )
}

function NotConfigured() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">⚙️</div>
        <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--text)' }}>App non configurata</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
          Le variabili d'ambiente Supabase non sono state trovate. Aggiungi{' '}
          <code style={{ color: 'var(--accent2)' }}>VITE_SUPABASE_URL</code> e{' '}
          <code style={{ color: 'var(--accent2)' }}>VITE_SUPABASE_ANON_KEY</code> ai secret di GitHub Actions,
          poi ri-esegui il workflow.
        </p>
        <a
          href="https://github.com"
          className="inline-block font-bold px-6 py-3 rounded-2xl text-sm transition-colors active:scale-95"
          style={{ background: 'var(--accent)', color: '#0a0a12' }}
        >
          Apri GitHub Settings
        </a>
      </div>
    </div>
  )
}

export default function App() {
  if (!isConfigured) return <NotConfigured />

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
      >
        <HashRouter>
          <ThemeBootstrap />
          <AppRoutes />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'var(--panel)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                borderRadius: '16px',
              },
            }}
          />
        </HashRouter>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  )
}
