import { NavLink } from 'react-router-dom'
import { CreditCard, BarChart2, Archive } from 'lucide-react'
import { cn } from '../../lib/utils'

const NAV_ITEMS = [
  { to: '/', icon: CreditCard, label: 'Carte' },
  { to: '/stats', icon: BarChart2, label: 'Statistiche' },
  { to: '/archive', icon: Archive, label: 'Archivio' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-[#0f0826]/90 backdrop-blur-xl border-t border-white/10 safe-bottom">
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
