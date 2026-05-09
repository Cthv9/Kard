import { useEffect, useState } from 'react'
import { X, Camera } from 'lucide-react'
import { useAddCard, useUpdateCard } from '../../hooks/useCards'
import { useCardStore } from '../../store/useCardStore'
import { CARD_COLORS } from '../../types/app'
import { BarcodeDisplay } from '../barcode/BarcodeDisplay'
import { useTranslation } from '../../hooks/useTranslation'
import { toast } from 'sonner'

export function AddCardForm() {
  const { closeAddCard, closeEditCard, openScanner, scannedCode, clearScannedCode, editingCard } = useCardStore()
  const t = useTranslation()
  const isEdit = !!editingCard

  const { mutate: addCard, isPending: addPending } = useAddCard()
  const { mutate: updateCard, isPending: updatePending } = useUpdateCard()
  const isPending = addPending || updatePending

  const [name, setName] = useState(editingCard?.name ?? '')
  const [description, setDescription] = useState(editingCard?.description ?? '')
  const [hasBalance, setHasBalance] = useState(
    editingCard ? editingCard.initial_balance > 0 : true
  )
  const [initialBalance, setInitialBalance] = useState(
    editingCard ? String(editingCard.initial_balance) : ''
  )
  const [currency, setCurrency] = useState(editingCard?.currency ?? 'EUR')
  const [code, setCode] = useState(editingCard?.code ?? scannedCode?.code ?? '')
  const [codeType, setCodeType] = useState<'barcode' | 'qrcode' | 'text'>(
    editingCard?.code_type ?? scannedCode?.codeType ?? 'barcode'
  )
  const [color, setColor] = useState<string>(editingCard?.color ?? CARD_COLORS[0])
  const [cardNumber, setCardNumber] = useState(editingCard?.card_number ?? '')
  const [expiryDate, setExpiryDate] = useState(editingCard?.expiry_date ?? '')

  // Consume scannedCode from store on mount
  useEffect(() => {
    if (scannedCode && !isEdit) clearScannedCode()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const barcodeValid = code.length > 0 && /^[\x20-\x7E]+$/.test(code)

  function handleClose() {
    if (isEdit) closeEditCard()
    else closeAddCard()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const balance = hasBalance ? parseFloat(initialBalance) : 0
    if (hasBalance && (isNaN(balance) || balance < 0)) {
      toast.error(t.cardForm.invalidBalance)
      return
    }

    if (isEdit && editingCard) {
      updateCard(
        {
          id: editingCard.id,
          name,
          description: description || null,
          code,
          code_type: codeType,
          initial_balance: balance,
          currency,
          color,
          card_number: cardNumber || null,
          expiry_date: expiryDate || null,
        },
        {
          onSuccess: () => {
            toast.success(t.cardForm.successEdit(name))
            closeEditCard()
          },
          onError: (err) => toast.error(err.message),
        }
      )
    } else {
      addCard(
        {
          name,
          description: description || null,
          code,
          code_type: codeType,
          initial_balance: balance,
          currency,
          color,
          card_number: cardNumber || null,
          expiry_date: expiryDate || null,
        },
        {
          onSuccess: () => {
            toast.success(t.cardForm.successNew(name))
            closeAddCard()
          },
          onError: (err) => toast.error(err.message),
        }
      )
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--panel)' }}
      >
        <div
          className="sticky top-0 px-5 pt-5 pb-3 flex items-center justify-between"
          style={{ backgroundColor: 'var(--panel)', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            {isEdit ? t.cardForm.titleEdit : t.cardForm.titleNew}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <Field label={t.cardForm.nameLabel}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={t.cardForm.namePlaceholder}
              className="input-dark"
            />
          </Field>

          {/* Description */}
          <Field label={t.cardForm.descLabel}>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.cardForm.descPlaceholder}
              className="input-dark"
            />
          </Field>

          {/* Has balance toggle */}
          <div className="flex items-center justify-between gap-3 py-1">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {t.cardForm.hasBalance}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {t.cardForm.hasBalanceHint}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHasBalance((v) => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                hasBalance ? 'bg-indigo-500' : 'bg-white/20'
              }`}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                style={{ transform: hasBalance ? 'translateX(24px)' : 'translateX(0)' }}
              />
            </button>
          </div>

          {/* Balance + Currency (only if hasBalance) */}
          {hasBalance && (
            <div className="flex gap-3">
              <Field label={t.cardForm.balanceLabel} className="flex-1">
                <input
                  type="number"
                  inputMode="decimal"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  required={hasBalance}
                  min="0"
                  step="0.01"
                  placeholder="50.00"
                  className="input-dark"
                />
              </Field>
              <Field label={t.cardForm.currencyLabel} className="w-24">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="input-dark"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </Field>
            </div>
          )}

          {/* Code type */}
          <Field label={t.cardForm.codeTypeLabel}>
            <div className="flex gap-2">
              {(['barcode', 'qrcode', 'text'] as const).map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setCodeType(tp)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                    codeType === tp
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  {tp === 'barcode' ? '▮▯▮▯' : tp === 'qrcode' ? 'QR' : 'Testo'}
                </button>
              ))}
            </div>
          </Field>

          {/* Code value */}
          <Field label={t.cardForm.codeLabel}>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\x20-\x7E]/g, ''))}
                required
                placeholder={t.cardForm.codePlaceholder}
                className="input-dark font-mono flex-1"
              />
              {!isEdit && (
                <button
                  type="button"
                  onClick={() => { closeAddCard(); openScanner() }}
                  title="Scansiona con fotocamera"
                  className="flex-shrink-0 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-xl px-3 border border-white/20 transition-colors"
                >
                  <Camera size={18} />
                </button>
              )}
            </div>
          </Field>

          {/* Live barcode preview */}
          {codeType === 'barcode' && code.length > 0 && (
            <div className="bg-white rounded-2xl p-4 flex items-center justify-center">
              {barcodeValid ? (
                <BarcodeDisplay value={code} height={60} displayValue />
              ) : (
                <p className="text-red-500 text-xs text-center">
                  {t.cardForm.invalidCode}
                </p>
              )}
            </div>
          )}

          {/* Card number (optional) */}
          <Field label={t.cardForm.cardNumberLabel}>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="es. •••• 1234"
              className="input-dark"
            />
          </Field>

          {/* Expiry (optional) */}
          <Field label={t.cardForm.expiryLabel}>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="input-dark"
            />
          </Field>

          {/* Color picker */}
          <Field label={t.cardForm.colorLabel}>
            <div className="flex gap-2 flex-wrap">
              {CARD_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-transform active:scale-90"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? '3px solid white' : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </Field>

          {/* Preview */}
          <div className="rounded-2xl overflow-hidden">
            <div
              className="h-16 rounded-2xl flex items-center px-4"
              style={{ backgroundColor: color }}
            >
              <span className="text-white font-bold text-sm truncate">
                {name || 'Nome carta'}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-2xl text-sm transition-all active:scale-95 disabled:opacity-60"
          >
            {isPending
              ? t.cardForm.saving
              : isEdit
              ? t.cardForm.submitEdit
              : t.cardForm.submitNew}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children, className }: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
