import { Eye, EyeOff, Share2, LogOut, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { usePrivacyStore } from '../../store/usePrivacyStore'
import { signOut } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from '../../hooks/useTranslation'

export function Header() {
  const profile = useAuthStore((s) => s.profile)
  const { privacyMode, togglePrivacy } = usePrivacyStore()
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
      await navigator.share({
        title: t.header.shareTitle,
        text: t.header.shareText(inviteCode),
      })
    } else {
      await navigator.clipboard.writeText(inviteCode)
      toast.success(t.header.codeCopied(inviteCode))
    }
    setMenuOpen(false)
  }

  return (
    <header className="flex items-center justify-between px-5 pt-safe pt-4 pb-3">
      <div className="font-black text-2xl tracking-tight" style={{ color: 'var(--text-primary)' }}>
        Kard
      </div>

      <div className="flex items-center gap-2">
        {/* Privacy toggle */}
        <button
          onClick={togglePrivacy}
          className={`p-2 rounded-full transition-all ${
            privacyMode ? 'bg-amber-400/20 text-amber-300' : 'hover:bg-white/20'
          }`}
          style={privacyMode ? {} : { color: 'var(--text-muted)' }}
          title={privacyMode ? t.header.privacyHide : t.header.privacyShow}
        >
          {privacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>

        {/* Avatar menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold active:scale-90 transition-transform"
            style={{ backgroundColor: profile?.avatar_color ?? '#6366f1' }}
          >
            {initials}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 top-11 z-50 rounded-2xl shadow-2xl w-52 py-2 overflow-hidden"
                style={{
                  backgroundColor: 'var(--panel)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {profile?.display_name}
                  </p>
                </div>
                <button
                  onClick={handleShareCode}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover-item)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                >
                  <Share2 size={16} />
                  {t.header.shareCode}
                </button>
                <button
                  onClick={() => { navigate('/settings'); setMenuOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover-item)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                >
                  <Settings size={16} />
                  {t.header.settings}
                </button>
                <button
                  onClick={() => { void signOut(); setMenuOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-red-400 hover:bg-red-500/10"
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
