import { useState } from 'react'
import { CreditCard, Fingerprint } from 'lucide-react'
import { verifyBiometric } from '../../lib/biometric'
import { useBiometricStore } from '../../store/useBiometricStore'
import { signOut } from '../../hooks/useAuth'
import { useTranslation } from '../../hooks/useTranslation'

export function BiometricLockScreen() {
  const { credentialId, setLocked } = useBiometricStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const t = useTranslation()

  async function handleUnlock() {
    if (!credentialId) return
    setLoading(true)
    setError(null)
    try {
      await verifyBiometric(credentialId)
      setLocked(false)
    } catch {
      setError(t.biometricLock.error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUsePassword() {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mb-3">
          <CreditCard className="text-white" size={32} />
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight mb-2">Kard</h1>
        <p className="text-white/60 text-sm mb-10">{t.biometricLock.subtitle}</p>

        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 space-y-4">
          <button
            onClick={handleUnlock}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-indigo-700 font-bold py-3.5 rounded-xl text-sm hover:bg-white/90 active:scale-95 transition-all disabled:opacity-60"
          >
            <Fingerprint size={20} />
            {loading ? t.common.loading : t.biometricLock.unlockBtn}
          </button>

          {error && (
            <p className="text-red-300 text-xs bg-red-500/20 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleUsePassword}
            className="text-white/60 text-sm hover:text-white/80 transition-colors"
          >
            {t.biometricLock.usePassword}
          </button>
        </div>
      </div>
    </div>
  )
}
