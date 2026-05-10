import { Share2, LogOut, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { signOut } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from '../../hooks/useTranslation'

interface HeaderProps {
  cardCount?: number
}

export function Header({ cardCount }: HeaderProps) {
  const profile = useAuthStore((s) => s.profile)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const t = useTranslation()

  const initials = profile?.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  async function handleShareCode() {
    const walletId = profile?.wallet_id
    if (!walletId) return
    const { data } = await supabase
      .from('wallets')
      .select('invite_code')
      .eq('id', walletId)
      .single()
    if (!data) return
    const inviteCode = (data as { invite_code: string }).invite_code.toUpperCase()
    if (navigator.share) {
      await navigator.share({ title: t.header.shareTitle, text: t.header.shareText(inviteCode) })
    } else {
      await navigator.clipboard.writeText(inviteCode)
      toast.success(t.header.codeCopied(inviteCode))
    }
    setMenuOpen(false)
  }

  return (
    <header
      className="flex items-center justify-between"
      style={{ padding: '56px 24px 20px' }}
    >
      {/* Left: logo + badge */}
      <div className="flex items-center gap-2.5">
        <span
          className="text-[22px] font-bold tracking-tight"
          style={{
            background: 'linear-gradient(135deg, var(--text) 0%, var(--muted) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Kard
        </span>
        {cardCount !== undefined && cardCount > 0 && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              fontFamily: "'DM Mono', monospace",
              letterSpacing: '0.5px',
              background: 'var(--surface2)',
              color: 'var(--accent)',
              border: '1px solid rgba(200,255,87,0.25)',
            }}
          >
            {cardCount} {cardCount === 1 ? 'carta' : 'carte'}
          </span>
        )}
      </div>

      {/* Right: avatar */}
      <div className="flex items-center gap-2.5">
        {/* Avatar with dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-white text-sm font-semibold active:scale-90 transition-transform"
            style={{
              background: profile?.avatar_color
                ? `linear-gradient(135deg, ${profile.avatar_color}, ${profile.avatar_color}cc)`
                : 'linear-gradient(135deg, var(--accent2), var(--accent))',
              boxShadow: '0 0 0 2px rgba(124,109,250,0.3)',
            }}
          >
            {initials}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 top-11 z-50 rounded-2xl shadow-2xl w-52 py-2 overflow-hidden"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  className="px-4 py-2"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                    {profile?.display_name}
                  </p>
                </div>
                <button
                  onClick={handleShareCode}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                  style={{ color: 'var(--muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover-item)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                >
                  <Share2 size={16} />
                  {t.header.shareCode}
                </button>
                <button
                  onClick={() => { navigate('/settings'); setMenuOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                  style={{ color: 'var(--muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover-item)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                >
                  <Settings size={16} />
                  {t.header.settings}
                </button>
                <button
                  onClick={() => { void signOut(); setMenuOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                  style={{ color: 'var(--danger)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,95,109,0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                >
                  <LogOut size={16} />
                  {t.header.signOut}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
