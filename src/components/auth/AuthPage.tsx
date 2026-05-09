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
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'var(--bg)' }}
      >
        <div className="w-full max-w-sm text-center">
          <div
            className="rounded-3xl p-8"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="text-5xl mb-4">📧</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>
              Controlla la tua email
            </h2>
            <p className="mb-6" style={{ color: 'var(--muted)' }}>
              Ti abbiamo inviato un link di conferma. Clicca il link per attivare il tuo account.
            </p>
            <button
              onClick={() => { setSignupDone(false); setMode('login') }}
              className="text-sm underline"
              style={{ color: 'var(--accent2)' }}
            >
              Torna al login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3"
            style={{ background: 'var(--surface2)' }}
          >
            <CreditCard style={{ color: 'var(--accent)' }} size={32} />
          </div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
            Kard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Il tuo portafoglio condiviso
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-6 shadow-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* Tab switch */}
          <div
            className="flex rounded-2xl p-1 mb-6"
            style={{ background: 'var(--surface2)' }}
          >
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null) }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                style={
                  mode === m
                    ? { background: 'var(--accent)', color: '#0a0a12' }
                    : { color: 'var(--muted)' }
                }
              >
                {m === 'login' ? 'Accedi' : 'Registrati'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--muted)' }}
              >
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="nome@esempio.it"
                className="input-dark"
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--muted)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="input-dark"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--muted)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
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
              {loading ? 'Caricamento...' : mode === 'login' ? 'Accedi' : 'Crea account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
