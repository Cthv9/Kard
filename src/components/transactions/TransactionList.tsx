import { useTransactions, useRealtimeTransactions } from '../../hooks/useTransactions'
import { timeAgo, formatCurrency } from '../../lib/utils'
import { useTranslation } from '../../hooks/useTranslation'
import type { TransactionWithUser } from '../../types/app'

interface TransactionListProps {
  cardId: string | null
}

export function TransactionList({ cardId }: TransactionListProps) {
  const { data: transactions, isLoading } = useTransactions(cardId)
  const t = useTranslation()
  useRealtimeTransactions(cardId)

  if (!cardId) return null

  if (isLoading) {
    return (
      <div className="px-4 space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-white/5 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-white/30 text-sm">{t.transactions.empty}</p>
      </div>
    )
  }

  return (
    <div className="px-4">
      <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">
        {t.transactions.title}
      </h3>
      <div className="space-y-2">
        {transactions.map((tx) => (
          <TransactionItem key={tx.id} tx={tx} />
        ))}
      </div>
    </div>
  )
}

function TransactionItem({ tx }: { tx: TransactionWithUser }) {
  const t = useTranslation()
  const user = tx.profile
  const initials = user.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex items-center gap-3 bg-white/5 hover:bg-white/8 rounded-2xl px-4 py-3 transition-colors">
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
        style={{ backgroundColor: user.avatar_color }}
      >
        {initials}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-white text-sm font-medium truncate">{user.display_name}</span>
          <span className="text-red-400 font-bold text-sm shrink-0 tabular-nums">
            -{formatCurrency(tx.amount)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-white/40 text-xs truncate">{tx.note ?? t.transactions.defaultNote}</span>
          <span className="text-white/30 text-xs shrink-0">{timeAgo(tx.created_at)}</span>
        </div>
      </div>
    </div>
  )
}
