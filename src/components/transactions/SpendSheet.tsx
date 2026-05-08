import { useState } from 'react'
import { X, Minus } from 'lucide-react'
import { useCardStore } from '../../store/useCardStore'
import { useDeductCredit } from '../../hooks/useTransactions'
import { formatCurrency } from '../../lib/utils'
import type { CardWithStats } from '../../types/app'
import { toast } from 'sonner'

interface SpendSheetProps {
  card: CardWithStats
}

const QUICK_AMOUNTS = [5, 10, 20, 50]

export function SpendSheet({ card }: SpendSheetProps) {
  const { isSpendSheetOpen, closeSpendSheet } = useCardStore()
  const { mutate: deduct, isPending } = useDeductCredit()
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
          toast.success(`-${formatCurrency(numAmount)} da "${card.name}"`)
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
    <div className="fixed inset-0 z-50 flex items-end" onClick={closeSpendSheet}>
      <div
        className="w-full bg-[#1a1040] rounded-t-3xl p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-white font-bold text-lg">Registra spesa</h3>
            <p className="text-white/50 text-xs">
              Saldo attuale: {formatCurrency(card.current_balance, card.currency)}
            </p>
          </div>
          <button
            onClick={closeSpendSheet}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount input */}
          <div>
            <label className="block text-white/70 text-xs font-medium mb-1.5">Importo (€)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 font-bold text-lg">€</span>
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
                className="w-full bg-white/10 text-white text-2xl font-bold text-right placeholder-white/30 rounded-2xl px-4 pl-10 py-4 outline-none border border-white/20 focus:border-indigo-400 transition-colors"
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
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  numAmount === a
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/15'
                }`}
              >
                €{a}
              </button>
            ))}
          </div>

          {/* Note */}
          <div>
            <label className="block text-white/70 text-xs font-medium mb-1.5">
              Nota (opzionale)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="es. Supermercato"
              maxLength={100}
              className="w-full bg-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none border border-white/20 focus:border-indigo-400 transition-colors"
            />
          </div>

          {/* Balance preview */}
          {isValid && (
            <div className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <Minus size={14} className="text-red-400" />
                <span>Nuovo saldo</span>
              </div>
              <span className="text-white font-bold">
                {formatCurrency(newBalance, card.currency)}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={!isValid || isPending}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-white/20 text-white font-bold py-4 rounded-2xl text-base transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Salvataggio...' : 'Conferma spesa'}
          </button>
        </form>
      </div>
    </div>
  )
}
