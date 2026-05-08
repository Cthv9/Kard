import { Eye, EyeOff, Share2, LogOut } from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import { usePrivacyStore } from '../../store/usePrivacyStore'
import { signOut } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useState } from 'react'
import { toast } from 'sonner'

export function Header() {
  const profile = useAuthStore((s) => s.profile)
  const { privacyMode, togglePrivacy } = usePrivacyStore()
  const [menuOpen, setMenuOpen] = useState(false)

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
        title: 'Unisciti al portafoglio Kard',
        text: `Usa il codice ${inviteCode} per unirti al nostro portafoglio condiviso su Kard.`,
      })
    } else {
      await navigator.clipboard.writeText(inviteCode)
      toast.success(`Codice copiato: ${inviteCode}`)
    }
    setMenuOpen(false)
  }

  return (
    <header className="flex items-center justify-between px-5 pt-safe pt-4 pb-3">
      <div className="text-white font-black text-2xl tracking-tight">Kard</div>

      <div className="flex items-center gap-2">
        {/* Privacy toggle */}
        <button
          onClick={togglePrivacy}
          className={`p-2 rounded-full transition-all ${
            privacyMode
              ? 'bg-amber-400/20 text-amber-300'
              : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
          }`}
          title={privacyMode ? 'Mostra saldi' : 'Nascondi saldi'}
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
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-11 z-50 bg-[#1a1040] border border-white/10 rounded-2xl shadow-2xl w-52 py-2 overflow-hidden">
                <div className="px-4 py-2 border-b border-white/10">
                  <p className="text-white font-semibold text-sm">{profile?.display_name}</p>
                </div>
                <button
                  onClick={handleShareCode}
                  className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/10 text-sm transition-colors"
                >
                  <Share2 size={16} />
                  Condividi codice invito
                </button>
                <button
                  onClick={() => { void signOut(); setMenuOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 text-sm transition-colors"
                >
                  <LogOut size={16} />
                  Esci
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
