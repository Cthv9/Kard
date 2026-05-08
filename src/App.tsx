import { HashRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from './lib/queryClient'
import { useAuthStore } from './store/useAuthStore'
import { useAuthInit } from './hooks/useAuth'
import { AuthPage } from './components/auth/AuthPage'
import { OnboardingPage } from './components/auth/OnboardingPage'
import { BottomNav } from './components/layout/BottomNav'
import { HomePage } from './pages/HomePage'
import { StatsPage } from './pages/StatsPage'
import { ArchivePage } from './pages/ArchivePage'

function AppRoutes() {
  useAuthInit()
  const { user, profile, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0826] to-[#1a0f3d] flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!user) return <AuthPage />
  if (!profile) return <OnboardingPage />

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/archive" element={<ArchivePage />} />
      </Routes>
      <BottomNav />
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AppRoutes />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1a1040',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              borderRadius: '16px',
            },
          }}
        />
      </HashRouter>
    </QueryClientProvider>
  )
}
