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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">👋</div>
          <h2 className="text-3xl font-black text-white">Benvenuto in Kard</h2>
          <p className="text-white/60 text-sm mt-1">Configura il tuo portafoglio condiviso</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 shadow-2xl">
          {step === 'choice' && (
            <div className="space-y-3">
              <button
                onClick={() => setStep('create')}
                className="w-full bg-white/20 hover:bg-white/30 text-white rounded-2xl p-5 text-left transition-all active:scale-95"
              >
                <div className="text-2xl mb-1">✨</div>
                <div className="font-bold">Crea un nuovo portafoglio</div>
                <div className="text-white/60 text-sm mt-0.5">Sei il primo della famiglia</div>
              </button>
              <button
                onClick={() => setStep('join')}
                className="w-full bg-white/20 hover:bg-white/30 text-white rounded-2xl p-5 text-left transition-all active:scale-95"
              >
                <div className="text-2xl mb-1">🔗</div>
                <div className="font-bold">Unisciti a un portafoglio</div>
                <div className="text-white/60 text-sm mt-0.5">Hai un codice invito</div>
              </button>
            </div>
          )}

          {(step === 'create' || step === 'join') && (
            <form onSubmit={step === 'create' ? handleCreate : handleJoin} className="space-y-4">
              <button
                type="button"
                onClick={() => { setStep('choice'); setError(null) }}
                className="text-white/60 text-sm hover:text-white flex items-center gap-1 mb-2"
              >
                ← Indietro
              </button>

              {step === 'create' && (
                <div>
                  <label className="block text-white/80 text-xs font-medium mb-1.5">
                    Nome portafoglio
                  </label>
                  <input
                    type="text"
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    required
                    placeholder="es. Famiglia Rossi"
                    className="w-full bg-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none border border-white/20 focus:border-white/60 transition-colors"
                  />
                </div>
              )}

              {step === 'join' && (
                <div>
                  <label className="block text-white/80 text-xs font-medium mb-1.5">
                    Codice invito
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    required
                    placeholder="es. a1b2c3d4"
                    maxLength={8}
                    className="w-full bg-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none border border-white/20 focus:border-white/60 transition-colors font-mono uppercase tracking-widest"
                  />
                </div>
              )}

              <div>
                <label className="block text-white/80 text-xs font-medium mb-1.5">
                  Il tuo nome
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="es. Marco"
                  className="w-full bg-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none border border-white/20 focus:border-white/60 transition-colors"
                />
              </div>

              <div>
                <label className="block text-white/80 text-xs font-medium mb-2">
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
                        outline: avatarColor === c ? '3px solid white' : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-red-300 text-xs bg-red-500/20 rounded-xl px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-indigo-700 font-bold py-3 rounded-xl text-sm hover:bg-white/90 active:scale-95 transition-all disabled:opacity-60"
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
