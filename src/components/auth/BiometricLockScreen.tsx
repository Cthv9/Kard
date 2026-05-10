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
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-sm text-center">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3"
          style={{ background: 'var(--surface2)' }}
        >
          <CreditCard style={{ color: 'var(--accent)' }} size={32} />
        </div>
        <h1
          className="text-4xl font-black tracking-tight mb-2"
          style={{ color: 'var(--text)' }}
        >
          Kard
        </h1>
        <p className="text-sm mb-10" style={{ color: 'var(--muted)' }}>
          {t.biometricLock.subtitle}
        </p>

        <div
          className="rounded-3xl p-6 space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <button
            onClick={handleUnlock}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm active:scale-95 transition-all disabled:opacity-60"
            style={{ background: 'var(--accent)', color: '#0a0a12', fontWeight: 700 }}
          >
            <Fingerprint size={20} />
            {loading ? t.common.loading : t.biometricLock.unlockBtn}
          </button>

          {error && (
            <p
              className="text-xs rounded-xl px-3 py-2"
              style={{ color: 'var(--danger)', background: 'rgba(255,95,109,0.1)' }}
            >
              {error}
            </p>
          )}

          <button
            onClick={handleUsePassword}
            className="text-sm transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            {t.biometricLock.usePassword}
          </button>
        </div>
      </div>
    </div>
  )
}
