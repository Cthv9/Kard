import { NavLink } from 'react-router-dom'
import { CreditCard, BarChart2, Archive, User } from 'lucide-react'
import { useTranslation } from '../../hooks/useTranslation'

export function BottomNav() {
  const t = useTranslation()

  const NAV_ITEMS = [
    { to: '/',        icon: CreditCard, label: t.nav.cards },
    { to: '/stats',   icon: BarChart2,  label: t.nav.stats },
    { to: '/archive', icon: Archive,    label: t.nav.archive },
    { to: '/settings',icon: User,       label: 'Profilo' },
  ]

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 safe-bottom"
      style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 420,
      }}
    >
      <div className="flex" style={{ padding: '12px 0 4px' }}>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="flex-1 flex flex-col items-center gap-1 transition-all active:scale-90"
            style={{ textDecoration: 'none' }}
          >
            {({ isActive }) => (
              <>
                <div
                  style={{
                    width: 36, height: 36,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isActive ? 'rgba(200,255,87,0.12)' : 'transparent',
                    transition: 'background 0.2s',
                  }}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    style={{ color: isActive ? 'var(--accent)' : 'var(--muted)' }}
                  />
                </div>
                <span
                  className="text-[10px] font-medium"
                  style={{
                    letterSpacing: '0.3px',
                    color: isActive ? 'var(--accent)' : 'var(--muted)',
                  }}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
