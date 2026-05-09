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
        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
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
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">
            {t.stats.totalCredit}
          </p>
          <div className="text-4xl font-black text-white mb-1">
            {formatCurrency(stats.totalRemaining)}
          </div>
          <div className="text-white/50 text-sm mb-4">
            {t.stats.of} {formatCurrency(stats.totalInitial)} {t.stats.initial}
          </div>

          {/* Global progress bar */}
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.max(2, 100 - usedPercent)}%`,
                background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
              }}
            />
          </div>
          <div className="flex justify-between text-white/30 text-xs mt-1.5">
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
            color="#6366f1"
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
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown size={16} className="text-white/60" />
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">
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
                <p className="text-white/30 text-sm text-center py-2">
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
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: u.profile.avatar_color }}
        >
          {initials}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-white font-medium text-sm">{u.profile.display_name}</span>
            <span className="text-white/80 font-bold text-sm">
              {formatCurrency(u.totalSpent)}
            </span>
          </div>
          <span className="text-white/40 text-xs">
            {t.stats.transactions(u.transactionCount)}
          </span>
        </div>
      </div>
      {/* Bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden ml-11">
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
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
        style={{ backgroundColor: `${color}33` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="text-white font-black text-2xl">{value}</div>
      <div className="text-white/50 text-xs mt-0.5">{label}</div>
    </div>
  )
}
