import { useState } from 'react'
import { X, Minus } from 'lucide-react'
import { useCardStore } from '../../store/useCardStore'
import { useDeductCredit } from '../../hooks/useTransactions'
import { formatCurrency } from '../../lib/utils'
import { useTranslation } from '../../hooks/useTranslation'
import type { CardWithStats } from '../../types/app'
import { toast } from 'sonner'

interface SpendSheetProps {
  card: CardWithStats
}

const QUICK_AMOUNTS = [5, 10, 20, 50]

export function SpendSheet({ card }: SpendSheetProps) {
  const { isSpendSheetOpen, closeSpendSheet } = useCardStore()
  const { mutate: deduct, isPending } = useDeductCredit()
  const t = useTranslation()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const numAmount = parseFloat(amount)
  const isValid = !isNaN(numAmount) && numAmount > 0 && numAmount <= card.current_balance
  const newBalance = isValid ? card.current_balance - numAmount : card.current_balance

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    deduct(
      { cardId: card.id, amount: numAmount, note: note || undefined },
      {
        onSuccess: () => {
          toast.success(t.spend.success(formatCurrency(numAmount), card.name))
          setAmount('')
          setNote('')
          closeSpendSheet()
        },
        onError: (err) => toast.error(err.message),
      }
    )
  }

  if (!isSpendSheetOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={closeSpendSheet}
    >
      <div
        className="w-full rounded-t-3xl p-5 shadow-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div
          className="w-10 h-1 rounded-full mx-auto mb-5"
          style={{ background: 'var(--muted2)' }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>
              {t.spend.title}
            </h3>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {t.spend.currentBalance(formatCurrency(card.current_balance, card.currency))}
            </p>
          </div>
          <button
            onClick={closeSpendSheet}
            className="p-2 rounded-full transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount input */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--muted)' }}
            >
              {t.spend.amountLabel}
            </label>
            <div className="relative">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-lg"
                style={{ color: 'var(--muted)' }}
              >
                €
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0.01"
                max={card.current_balance}
                step="0.01"
                placeholder="0.00"
                autoFocus
                className="input-dark text-2xl font-bold text-right py-4"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          {/* Quick amount buttons */}
          <div className="flex gap-2">
            {QUICK_AMOUNTS.filter((a) => a <= card.current_balance).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(String(a))}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={
                  numAmount === a
                    ? { background: 'var(--accent)', color: '#0a0a12' }
                    : { background: 'var(--surface2)', color: 'var(--muted)' }
                }
              >
                €{a}
              </button>
            ))}
          </div>

          {/* Note */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--muted)' }}
            >
              {t.spend.noteLabel}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.spend.notePlaceholder}
              maxLength={100}
              className="input-dark"
            />
          </div>

          {/* Balance preview */}
          {isValid && (
            <div
              className="flex items-center justify-between rounded-2xl px-4 py-3"
              style={{ background: 'var(--surface2)' }}
            >
              <div
                className="flex items-center gap-2 text-sm"
                style={{ color: 'var(--muted)' }}
              >
                <Minus size={14} style={{ color: 'var(--danger)' }} />
                <span>{t.spend.newBalance}</span>
              </div>
              <span className="font-bold" style={{ color: 'var(--text)' }}>
                {formatCurrency(newBalance, card.currency)}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={!isValid || isPending}
            className="w-full py-4 rounded-2xl text-base transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)', color: '#0a0a12', fontWeight: 700 }}
          >
            {isPending ? t.spend.saving : t.spend.confirmBtn}
          </button>
        </form>
      </div>
    </div>
  )
}
