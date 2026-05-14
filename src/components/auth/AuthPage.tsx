import { useEffect, useRef, useState } from 'react'
import { CreditCard, Eye, EyeOff } from 'lucide-react'
import { signIn, signUp } from '../../hooks/useAuth'

type Mode = 'login' | 'signup'

// Client-side defense-in-depth on top of Supabase's server rate limit.
// The state lives in sessionStorage so an F5 cannot bypass the cooldown,
// but a fresh tab starts clean (no false positives across browsing sessions).
const RATE_KEY = 'kard-auth-rate-v1'
const WINDOW_MS = 5 * 60_000
const MAX_BEFORE_COOLDOWN = 5

interface RateState {
  failures: number[] // unix-ms timestamps within the trailing window
  lockedUntil: number | null
}

function readRate(): RateState {
  try {
    const raw = sessionStorage.getItem(RATE_KEY)
    if (!raw) return { failures: [], lockedUntil: null }
    const parsed = JSON.parse(raw) as RateState
    const now = Date.now()
    return {
      failures: parsed.failures.filter((t) => now - t < WINDOW_MS),
      lockedUntil: parsed.lockedUntil && parsed.lockedUntil > now ? parsed.lockedUntil : null,
    }
  } catch {
    return { failures: [], lockedUntil: null }
  }
}

function writeRate(state: RateState): void {
  try {
    sessionStorage.setItem(RATE_KEY, JSON.stringify(state))
  } catch {
    // sessionStorage can throw in private mode — ignore.
  }
}

function cooldownFor(failures: number): number {
  // After the threshold, lock for 30s, 2min, 10min on successive trios.
  if (failures < MAX_BEFORE_COOLDOWN) return 0
  if (failures < MAX_BEFORE_COOLDOWN + 3) return 30_000
  if (failures < MAX_BEFORE_COOLDOWN + 6) return 120_000
  return 600_000
}

// Require at least one letter and one digit in new passwords.
const SIGNUP_PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/
const SIGNUP_MIN_LEN = 10

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [signupDone, setSignupDone] = useState(false)
  const [lockedUntil, setLockedUntil] = useState<number | null>(() => readRate().lockedUntil)
  const [now, setNow] = useState(() => Date.now())
  const rateRef = useRef<RateState>(readRate())

  // Tick once per second only while a lockout is active. No setInterval when idle.
  useEffect(() => {
    if (!lockedUntil) return
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= lockedUntil) setLockedUntil(null)
    }, 1000)
    return () => clearInterval(id)
  }, [lockedUntil])

  const remainingMs = lockedUntil ? Math.max(0, lockedUntil - now) : 0
  const isLocked = remainingMs > 0

  function recordFailure() {
    const t = Date.now()
    const failures = [...rateRef.current.failures.filter((x) => t - x < WINDOW_MS), t]
    const cooldown = cooldownFor(failures.length)
    const next: RateState = {
      failures,
      lockedUntil: cooldown > 0 ? t + cooldown : null,
    }
    rateRef.current = next
    writeRate(next)
    if (next.lockedUntil) setLockedUntil(next.lockedUntil)
  }

  function recordSuccess() {
    rateRef.current = { failures: [], lockedUntil: null }
    writeRate(rateRef.current)
    setLockedUntil(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isLocked) return
    setError(null)

    if (mode === 'signup') {
      if (password.length < SIGNUP_MIN_LEN) {
        setError(`La password deve avere almeno ${SIGNUP_MIN_LEN} caratteri.`)
        return
      }
      if (!SIGNUP_PASSWORD_PATTERN.test(password)) {
        setError('La password deve contenere almeno una lettera e un numero.')
        return
      }
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        setSignupDone(true)
      }
      recordSuccess()
    } catch (err) {
      recordFailure()
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
                  minLength={mode === 'signup' ? SIGNUP_MIN_LEN : 1}
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
              {mode === 'signup' && (
                <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>
                  Minimo {SIGNUP_MIN_LEN} caratteri, almeno una lettera e un numero.
                </p>
              )}
            </div>

            {error && (
              <p
                className="text-xs rounded-xl px-3 py-2"
                style={{ color: 'var(--danger)', background: 'rgba(255,95,109,0.1)' }}
              >
                {error}
              </p>
            )}

            {isLocked && (
              <p
                className="text-xs rounded-xl px-3 py-2"
                style={{ color: 'var(--danger)', background: 'rgba(255,95,109,0.1)' }}
              >
                Troppi tentativi. Riprova tra {Math.ceil(remainingMs / 1000)}s.
              </p>
            )}

            <button
              type="submit"
              disabled={loading || isLocked}
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
