import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import { CARD_COLORS } from '../../types/app'

type Step = 'choice' | 'create' | 'join'

export function OnboardingPage() {
  const [step, setStep] = useState<Step>('choice')
  const [walletName, setWalletName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [avatarColor, setAvatarColor] = useState<string>(CARD_COLORS[0])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { setProfile } = useAuthStore()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('create_wallet', {
        p_wallet_name: walletName,
        p_display_name: displayName,
        p_avatar_color: avatarColor,
      })
      if (rpcError) throw rpcError
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', (await supabase.auth.getUser()).data.user!.id)
        .single()
      if (profile) setProfile(profile)
      void data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('join_wallet', {
        p_invite_code: inviteCode.trim().toLowerCase(),
        p_display_name: displayName,
        p_avatar_color: avatarColor,
      })
      if (rpcError) throw rpcError
      setProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Codice non valido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">👋</div>
          <h2 className="text-3xl font-black" style={{ color: 'var(--text)' }}>
            Benvenuto in Kard
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Configura il tuo portafoglio condiviso
          </p>
        </div>

        <div
          className="rounded-3xl p-6 shadow-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {step === 'choice' && (
            <div className="space-y-3">
              <button
                onClick={() => setStep('create')}
                className="w-full rounded-2xl p-5 text-left transition-all active:scale-95"
                style={{ background: 'var(--surface2)', color: 'var(--text)' }}
              >
                <div className="text-2xl mb-1">✨</div>
                <div className="font-bold">Crea un nuovo portafoglio</div>
                <div className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
                  Sei il primo della famiglia
                </div>
              </button>
              <button
                onClick={() => setStep('join')}
                className="w-full rounded-2xl p-5 text-left transition-all active:scale-95"
                style={{ background: 'var(--surface2)', color: 'var(--text)' }}
              >
                <div className="text-2xl mb-1">🔗</div>
                <div className="font-bold">Unisciti a un portafoglio</div>
                <div className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
                  Hai un codice invito
                </div>
              </button>
            </div>
          )}

          {(step === 'create' || step === 'join') && (
            <form onSubmit={step === 'create' ? handleCreate : handleJoin} className="space-y-4">
              <button
                type="button"
                onClick={() => { setStep('choice'); setError(null) }}
                className="text-sm flex items-center gap-1 mb-2"
                style={{ color: 'var(--muted)' }}
              >
                ← Indietro
              </button>

              {step === 'create' && (
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--muted)' }}
                  >
                    Nome portafoglio
                  </label>
                  <input
                    type="text"
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    required
                    placeholder="es. Famiglia Rossi"
                    className="input-dark"
                  />
                </div>
              )}

              {step === 'join' && (
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--muted)' }}
                  >
                    Codice invito
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    required
                    placeholder="es. a1b2c3d4"
                    maxLength={8}
                    className="input-dark font-mono uppercase tracking-widest"
                  />
                </div>
              )}

              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: 'var(--muted)' }}
                >
                  Il tuo nome
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="es. Marco"
                  className="input-dark"
                />
              </div>

              <div>
                <label
                  className="block text-xs font-medium mb-2"
                  style={{ color: 'var(--muted)' }}
                >
                  Colore avatar
                </label>
                <div className="flex gap-2 flex-wrap">
                  {CARD_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAvatarColor(c)}
                      className="w-8 h-8 rounded-full transition-transform active:scale-90"
                      style={{
                        backgroundColor: c,
                        outline: avatarColor === c ? '3px solid var(--accent)' : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <p
                  className="text-xs rounded-xl px-3 py-2"
                  style={{ color: 'var(--danger)', background: 'rgba(255,95,109,0.1)' }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm active:scale-95 transition-all disabled:opacity-60"
                style={{ background: 'var(--accent)', color: '#0a0a12', fontWeight: 700 }}
              >
                {loading ? 'Caricamento...' : step === 'create' ? 'Crea portafoglio' : 'Entra'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
