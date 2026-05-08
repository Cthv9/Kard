import { useState } from 'react'
import { CreditCard, Eye, EyeOff } from 'lucide-react'
import { signIn, signUp } from '../../hooks/useAuth'

type Mode = 'login' | 'signup'

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [signupDone, setSignupDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        setSignupDone(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }

  if (signupDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 text-white">
            <div className="text-5xl mb-4">📧</div>
            <h2 className="text-2xl font-bold mb-2">Controlla la tua email</h2>
            <p className="text-white/70 mb-6">
              Ti abbiamo inviato un link di conferma. Clicca il link per attivare il tuo account.
            </p>
            <button
              onClick={() => { setSignupDone(false); setMode('login') }}
              className="text-white/80 underline text-sm"
            >
              Torna al login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mb-3">
            <CreditCard className="text-white" size={32} />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Kard</h1>
          <p className="text-white/60 text-sm mt-1">Il tuo portafoglio condiviso</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 shadow-2xl">
          {/* Tab switch */}
          <div className="flex bg-white/10 rounded-2xl p-1 mb-6">
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null) }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  mode === m
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {m === 'login' ? 'Accedi' : 'Registrati'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/80 text-xs font-medium mb-1.5">Email</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="nome@esempio.it"
                className="w-full bg-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none border border-white/20 focus:border-white/60 transition-colors"
              />
            </div>

            <div>
              <label className="block text-white/80 text-xs font-medium mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="w-full bg-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 pr-10 text-sm outline-none border border-white/20 focus:border-white/60 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
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
              {loading ? 'Caricamento...' : mode === 'login' ? 'Accedi' : 'Crea account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
