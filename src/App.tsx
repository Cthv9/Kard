import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from './lib/queryClient'
import { isConfigured } from './lib/supabase'
import { useAuthStore } from './store/useAuthStore'
import { useSettingsStore } from './store/useSettingsStore'
import { useAuthInit } from './hooks/useAuth'
import { AuthPage } from './components/auth/AuthPage'
import { OnboardingPage } from './components/auth/OnboardingPage'
import { BiometricLockScreen } from './components/auth/BiometricLockScreen'
import { useBiometricStore } from './store/useBiometricStore'
import { BottomNav } from './components/layout/BottomNav'
import { HomePage } from './pages/HomePage'
import { StatsPage } from './pages/StatsPage'
import { ArchivePage } from './pages/ArchivePage'
import { SettingsPage } from './pages/SettingsPage'

function ThemeBootstrap() {
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--page-bg)' }}>
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Caricamento...</p>
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
    </>
  )
}

function NotConfigured() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0826] to-[#1a0f3d] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">⚙️</div>
        <h2 className="text-white font-black text-2xl mb-2">App non configurata</h2>
        <p className="text-white/60 text-sm mb-6">
          Le variabili d'ambiente Supabase non sono state trovate. Aggiungi{' '}
          <code className="text-indigo-300">VITE_SUPABASE_URL</code> e{' '}
          <code className="text-indigo-300">VITE_SUPABASE_ANON_KEY</code> ai secret di GitHub Actions,
          poi ri-esegui il workflow.
        </p>
        <a
          href="https://github.com"
          className="inline-block bg-indigo-500 text-white font-bold px-6 py-3 rounded-2xl text-sm hover:bg-indigo-600 transition-colors"
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
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  )
}
