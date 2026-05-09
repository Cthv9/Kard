import { Header } from '../components/layout/Header'
import { useStats } from '../hooks/useStats'
import { formatCurrency } from '../lib/utils'
import { useTranslation } from '../hooks/useTranslation'
import { TrendingDown, CreditCard, Archive } from 'lucide-react'
import type { UserSpending } from '../types/app'

export function StatsPage() {
  const { data: stats, isLoading } = useStats()
  const t = useTranslation()

  if (isLoading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--page-bg)' }}>
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent2)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const totalSpent = stats.totalInitial - stats.totalRemaining
  const usedPercent = stats.totalInitial > 0 ? (totalSpent / stats.totalInitial) * 100 : 0
  const totalUserSpend = stats.userSpending.reduce((s, u) => s + u.totalSpent, 0)

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--page-bg)' }}>
      <Header />

      <main className="px-4 pt-2 space-y-4">
        {/* Total credit widget */}
        <div
          className="rounded-3xl p-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--muted)' }}
          >
            {t.stats.totalCredit}
          </p>
          <div className="text-4xl font-black mb-1" style={{ color: 'var(--text)' }}>
            {formatCurrency(stats.totalRemaining)}
          </div>
          <div className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            {t.stats.of} {formatCurrency(stats.totalInitial)} {t.stats.initial}
          </div>

          {/* Global progress bar */}
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.max(2, 100 - usedPercent)}%`,
                background: 'linear-gradient(90deg, var(--accent2), #a78bfa)',
              }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1.5" style={{ color: 'var(--muted2)' }}>
            <span>{t.stats.used(usedPercent.toFixed(0))}</span>
            <span>{t.stats.spent(formatCurrency(totalSpent))}</span>
          </div>
        </div>

        {/* Card counts */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<CreditCard size={18} />}
            label={t.stats.activeCards}
            value={String(stats.activeCardCount)}
            color="var(--accent2)"
          />
          <StatCard
            icon={<Archive size={18} />}
            label={t.stats.archived}
            value={String(stats.archivedCardCount)}
            color="#8b5cf6"
          />
        </div>

        {/* User spending breakdown */}
        {stats.userSpending.length > 0 && (
          <div
            className="rounded-3xl p-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown size={16} style={{ color: 'var(--muted)' }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                {t.stats.userSpending}
              </p>
            </div>

            <div className="space-y-4">
              {stats.userSpending
                .filter((u) => u.totalSpent > 0)
                .sort((a, b) => b.totalSpent - a.totalSpent)
                .map((u) => (
                  <UserSpendRow key={u.profile.id} u={u} total={totalUserSpend} />
                ))}
              {stats.userSpending.every((u) => u.totalSpent === 0) && (
                <p className="text-sm text-center py-2" style={{ color: 'var(--muted)' }}>
                  {t.stats.noSpending}
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function UserSpendRow({ u, total }: { u: UserSpending; total: number }) {
  const t = useTranslation()
  const pct = total > 0 ? (u.totalSpent / total) * 100 : 0
  const initials = u.profile.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ backgroundColor: u.profile.avatar_color, color: '#fff' }}
        >
          {initials}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>
              {u.profile.display_name}
            </span>
            <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>
              {formatCurrency(u.totalSpent)}
            </span>
          </div>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            {t.stats.transactions(u.transactionCount)}
          </span>
        </div>
      </div>
      {/* Bar */}
      <div className="h-2 rounded-full overflow-hidden ml-11" style={{ background: 'var(--surface2)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            backgroundColor: u.profile.avatar_color,
          }}
        />
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
        style={{ backgroundColor: `${color}22` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="font-black text-2xl" style={{ color: 'var(--text)' }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{label}</div>
    </div>
  )
}
