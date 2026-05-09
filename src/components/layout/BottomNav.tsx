import { NavLink } from 'react-router-dom'
import { CreditCard, BarChart2, Archive } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useTranslation } from '../../hooks/useTranslation'

export function BottomNav() {
  const t = useTranslation()
  const NAV_ITEMS = [
    { to: '/', icon: CreditCard, label: t.nav.cards },
    { to: '/stats', icon: BarChart2, label: t.nav.stats },
    { to: '/archive', icon: Archive, label: t.nav.archive },
  ]
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 backdrop-blur-xl border-t safe-bottom" style={{ backgroundColor: 'var(--nav)', borderColor: 'var(--border-subtle)' }}>
      <div className="flex">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center gap-1 py-3 transition-all',
                isActive ? 'text-indigo-400' : 'text-white/40 hover:text-white/70'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-[10px] font-semibold">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
