import { CreditCard } from 'lucide-react'
import { useTransactions, useRealtimeTransactions } from '../../hooks/useTransactions'
import { timeAgo, formatCurrency, initialsOf, getDateLocale } from '../../lib/utils'
import { useTranslation } from '../../hooks/useTranslation'
import { useSettingsStore } from '../../store/useSettingsStore'
import type { TransactionWithUser } from '../../types/app'

interface TransactionListProps {
  cardId: string | null
}

export function TransactionList({ cardId }: TransactionListProps) {
  const { data: transactions, isLoading } = useTransactions(cardId)
  useRealtimeTransactions(cardId)
  const t = useTranslation()

  if (!cardId) return null

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-2xl animate-pulse"
            style={{ background: 'var(--surface2)' }}
          />
        ))}
      </div>
    )
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div
          className="flex items-center justify-center"
          style={{
            width: 52, height: 52,
            borderRadius: '50%',
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            marginBottom: 4,
          }}
        >
          <CreditCard size={22} style={{ color: 'var(--muted)' }} strokeWidth={1.5} />
        </div>
        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
          {t.transactions.empty}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <TransactionItem key={tx.id} tx={tx} />
      ))}
    </div>
  )
}

function TransactionItem({ tx }: { tx: TransactionWithUser }) {
  const t = useTranslation()
  const language = useSettingsStore((s) => s.language)
  const user = tx.profile
  const initials = initialsOf(user.display_name)

  return (
    <div
      className="flex items-center gap-3.5 transition-colors cursor-pointer"
      style={{
        padding: '14px 16px',
        background: 'var(--surface2)',
        borderRadius: 14,
        border: '1px solid var(--border)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
    >
      {/* Avatar */}
      <div
        className="flex items-center justify-center text-white text-xs font-bold shrink-0"
        style={{
          width: 40, height: 40,
          borderRadius: 12,
          backgroundColor: user.avatar_color,
          fontSize: 14,
        }}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div
          className="text-[14px] font-medium mb-0.5 truncate"
          style={{ color: 'var(--text)' }}
        >
          {user.display_name}
        </div>
        <div
          className="text-[11px] truncate"
          style={{
            fontFamily: "'DM Mono', monospace",
            color: 'var(--muted)',
          }}
        >
          {tx.note ?? t.transactions.defaultNote} · {timeAgo(tx.created_at, getDateLocale(language))}
        </div>
      </div>

      {/* Amount */}
      <div
        className="font-medium tabular-nums shrink-0"
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 14,
          color: '#ff7b87',
        }}
      >
        −{formatCurrency(tx.amount)}
      </div>
    </div>
  )
}
